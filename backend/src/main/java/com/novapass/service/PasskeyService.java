package com.novapass.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novapass.dto.AuthDTOs;
import com.novapass.dto.PasskeyDTOs.*;
import com.novapass.exception.ResourceNotFoundException;
import com.novapass.model.Passkey;
import com.novapass.model.User;
import com.novapass.repository.PasskeyRepository;
import com.novapass.repository.RefreshTokenRepository;
import com.novapass.repository.UserRepository;
import com.novapass.security.JwtTokenProvider;
import com.webauthn4j.WebAuthnManager;
import com.webauthn4j.authenticator.Authenticator;
import com.webauthn4j.authenticator.AuthenticatorImpl;
import com.webauthn4j.converter.AttestedCredentialDataConverter;
import com.webauthn4j.converter.util.ObjectConverter;
import com.webauthn4j.data.*;
import com.webauthn4j.data.attestation.AttestationObject;
import com.webauthn4j.data.attestation.authenticator.AttestedCredentialData;
import com.webauthn4j.data.attestation.authenticator.COSEKey;
import com.webauthn4j.data.attestation.statement.AttestationStatement;
import com.webauthn4j.data.client.Origin;
import com.webauthn4j.data.client.challenge.Challenge;
import com.webauthn4j.data.client.challenge.DefaultChallenge;
import com.webauthn4j.server.ServerProperty;
import com.webauthn4j.validator.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PasskeyService {

    private final PasskeyRepository passkeyRepository;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuditService auditService;

    @Value("${webauthn.rp.id:localhost}")
    private String rpId;

    @Value("${webauthn.rp.name:NovaPass}")
    private String rpName;

    @Value("${webauthn.rp.origin:http://localhost:3000}")
    private String rpOrigin;

    private final WebAuthnManager webAuthnManager = WebAuthnManager.createNonStrictWebAuthnManager();
    private final ObjectConverter objectConverter = new ObjectConverter();
    private final AttestedCredentialDataConverter credentialDataConverter = new AttestedCredentialDataConverter(objectConverter);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final SecureRandom secureRandom = new SecureRandom();

    // In-memory challenge store (use Redis in production for multi-instance)
    private final Map<String, ChallengeData> challengeStore = new ConcurrentHashMap<>();

    private static final long CHALLENGE_TIMEOUT_MS = 300_000; // 5 minutes
    private static final long WEBAUTHN_TIMEOUT = 60_000; // 60 seconds for user interaction

    // ============ Registration Flow ============

    @Transactional(readOnly = true)
    public PasskeyRegistrationBeginResponse beginRegistration(Long userId, String passkeyName) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        byte[] challengeBytes = new byte[32];
        secureRandom.nextBytes(challengeBytes);
        String challenge = Base64.getUrlEncoder().withoutPadding().encodeToString(challengeBytes);

        byte[] userHandleBytes = new byte[32];
        secureRandom.nextBytes(userHandleBytes);
        String userHandle = Base64.getUrlEncoder().withoutPadding().encodeToString(userHandleBytes);

        // Store challenge for verification
        challengeStore.put(challenge, new ChallengeData(
            userId,
            challengeBytes,
            userHandle,
            passkeyName,
            System.currentTimeMillis()
        ));

        // Get existing credentials to exclude
        List<ExcludeCredential> excludeCredentials = passkeyRepository.findByUserId(userId).stream()
            .map(p -> ExcludeCredential.builder()
                .id(p.getCredentialId())
                .type("public-key")
                .transports(parseTransports(p.getTransports()))
                .build())
            .collect(Collectors.toList());

        return PasskeyRegistrationBeginResponse.builder()
            .challenge(challenge)
            .rp(RelyingParty.builder().id(rpId).name(rpName).build())
            .user(UserInfo.builder()
                .id(userHandle)
                .name(user.getEmail())
                .displayName(user.getUsername())
                .build())
            .pubKeyCredParams(List.of(
                PubKeyCredParam.builder().type("public-key").alg(-7L).build(),   // ES256
                PubKeyCredParam.builder().type("public-key").alg(-257L).build()  // RS256
            ))
            .timeout(WEBAUTHN_TIMEOUT)
            .attestation("none")
            .authenticatorSelection(AuthenticatorSelection.builder()
                .authenticatorAttachment("platform")
                .requireResidentKey(false)
                .residentKey("preferred")
                .userVerification("preferred")
                .build())
            .excludeCredentials(excludeCredentials)
            .build();
    }

    @Transactional
    public PasskeyRegistrationCompleteResponse completeRegistration(
            Long userId,
            PasskeyRegistrationCompleteRequest request) {

        // Decode the credential ID from the request
        String credentialIdBase64 = request.getId();

        // Find and validate the challenge
        ChallengeData challengeData = null;
        String challengeKey = null;
        for (Map.Entry<String, ChallengeData> entry : challengeStore.entrySet()) {
            if (entry.getValue().userId.equals(userId) && 
                System.currentTimeMillis() - entry.getValue().timestamp < CHALLENGE_TIMEOUT_MS) {
                challengeData = entry.getValue();
                challengeKey = entry.getKey();
                break;
            }
        }

        if (challengeData == null) {
            throw new BadCredentialsException("No valid registration challenge found");
        }

        try {
            // Decode WebAuthn response
            byte[] clientDataJSON = Base64.getUrlDecoder().decode(request.getResponse().getClientDataJSON());
            byte[] attestationObject = Base64.getUrlDecoder().decode(request.getResponse().getAttestationObject());

            // Create server property
            Origin origin = new Origin(rpOrigin);
            Challenge challenge = new DefaultChallenge(challengeData.challengeBytes);
            ServerProperty serverProperty = new ServerProperty(origin, rpId, challenge, null);

            // Create registration request
            RegistrationRequest registrationRequest = new RegistrationRequest(attestationObject, clientDataJSON);

            // Set registration parameters
            RegistrationParameters registrationParameters = new RegistrationParameters(
                serverProperty,
                null, // pubKeyCredParams (allow any)
                false, // userVerificationRequired
                false  // userPresenceRequired
            );

            // Validate registration
            RegistrationData registrationData = webAuthnManager.parse(registrationRequest);
            webAuthnManager.validate(registrationData, registrationParameters);

            // Extract credential data
            AttestationObject attestation = registrationData.getAttestationObject();
            AttestedCredentialData credentialData = attestation.getAuthenticatorData().getAttestedCredentialData();

            if (credentialData == null) {
                throw new BadCredentialsException("No credential data in attestation");
            }

            byte[] credentialId = credentialData.getCredentialId();
            String credentialIdStr = Base64.getUrlEncoder().withoutPadding().encodeToString(credentialId);

            // Check if credential already exists
            if (passkeyRepository.existsByCredentialId(credentialIdStr)) {
                throw new BadCredentialsException("Credential already registered");
            }

            // Serialize the COSE key
            COSEKey coseKey = credentialData.getCOSEKey();
            byte[] coseKeyBytes = credentialDataConverter.convert(credentialData);
            String publicKeyCose = Base64.getEncoder().encodeToString(coseKeyBytes);

            // Get AAGUID
            String aaguid = credentialData.getAaguid() != null 
                ? credentialData.getAaguid().toString() 
                : null;

            // Get transports
            List<String> transports = request.getResponse().getTransports();
            String transportsJson = transports != null ? toJson(transports) : null;

            // Create passkey record
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

            Passkey passkey = Passkey.builder()
                .user(user)
                .credentialId(credentialIdStr)
                .publicKeyCose(publicKeyCose)
                .signCount(registrationData.getAttestationObject().getAuthenticatorData().getSignCount())
                .name(challengeData.passkeyName != null ? challengeData.passkeyName : "Passkey " + (passkeyRepository.countByUserId(userId) + 1))
                .transports(transportsJson)
                .aaguid(aaguid)
                .userHandle(challengeData.userHandle)
                .attestationFormat(attestation.getFormat())
                .build();

            passkey = passkeyRepository.save(passkey);

            // Clear used challenge
            challengeStore.remove(challengeKey);

            auditService.log(user, "PASSKEY_REGISTER", "passkey", passkey.getId(), null, null);

            return PasskeyRegistrationCompleteResponse.builder()
                .passkeyId(passkey.getId())
                .credentialId(credentialIdStr)
                .name(passkey.getName())
                .message("Passkey registered successfully")
                .build();

        } catch (ValidationException e) {
            log.error("WebAuthn registration validation failed", e);
            throw new BadCredentialsException("Passkey registration failed: " + e.getMessage());
        } catch (Exception e) {
            log.error("Passkey registration error", e);
            throw new BadCredentialsException("Passkey registration failed");
        }
    }

    // ============ Authentication Flow ============

    public PasskeyAuthBeginResponse beginAuthentication(String email) {
        byte[] challengeBytes = new byte[32];
        secureRandom.nextBytes(challengeBytes);
        String challenge = Base64.getUrlEncoder().withoutPadding().encodeToString(challengeBytes);

        List<AllowCredential> allowCredentials = Collections.emptyList();
        Long userId = null;

        if (email != null && !email.isBlank()) {
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isPresent()) {
                userId = userOpt.get().getId();
                allowCredentials = passkeyRepository.findByUserId(userId).stream()
                    .map(p -> AllowCredential.builder()
                        .id(p.getCredentialId())
                        .type("public-key")
                        .transports(parseTransports(p.getTransports()))
                        .build())
                    .collect(Collectors.toList());
            }
        }

        // Store challenge for verification
        challengeStore.put(challenge, new ChallengeData(
            userId,
            challengeBytes,
            null,
            null,
            System.currentTimeMillis()
        ));

        return PasskeyAuthBeginResponse.builder()
            .challenge(challenge)
            .timeout(WEBAUTHN_TIMEOUT)
            .rpId(rpId)
            .allowCredentials(allowCredentials.isEmpty() ? null : allowCredentials)
            .userVerification("preferred")
            .build();
    }

    @Transactional
    public AuthDTOs.TokenResponse completeAuthentication(
            PasskeyAuthCompleteRequest request,
            String ip,
            String userAgent) {

        try {
            byte[] clientDataJSON = Base64.getUrlDecoder().decode(request.getResponse().getClientDataJSON());
            byte[] authenticatorData = Base64.getUrlDecoder().decode(request.getResponse().getAuthenticatorData());
            byte[] signature = Base64.getUrlDecoder().decode(request.getResponse().getSignature());

            String credentialIdStr = request.getId();
            Passkey passkey = passkeyRepository.findByCredentialId(credentialIdStr)
                .orElseThrow(() -> new BadCredentialsException("Unknown credential"));

            User user = passkey.getUser();
            if (!user.isActive()) {
                throw new BadCredentialsException("Account disabled");
            }

            // Find the challenge that was issued
            ChallengeData challengeData = null;
            String challengeKey = null;
            for (Map.Entry<String, ChallengeData> entry : challengeStore.entrySet()) {
                if (System.currentTimeMillis() - entry.getValue().timestamp < CHALLENGE_TIMEOUT_MS) {
                    // Verify this challenge matches what the client responded to
                    challengeData = entry.getValue();
                    challengeKey = entry.getKey();
                    break;
                }
            }

            if (challengeData == null) {
                throw new BadCredentialsException("No valid authentication challenge found");
            }

            // Reconstruct the authenticator for validation
            byte[] credentialDataBytes = Base64.getDecoder().decode(passkey.getPublicKeyCose());
            AttestedCredentialData attestedCredentialData = credentialDataConverter.convert(credentialDataBytes);

            Authenticator authenticator = new AuthenticatorImpl(
                attestedCredentialData,
                null, // attestation statement not needed for authentication
                passkey.getSignCount()
            );

            // Create server property
            Origin origin = new Origin(rpOrigin);
            Challenge challenge = new DefaultChallenge(challengeData.challengeBytes);
            ServerProperty serverProperty = new ServerProperty(origin, rpId, challenge, null);

            // Create authentication request
            AuthenticationRequest authRequest = new AuthenticationRequest(
                Base64.getUrlDecoder().decode(credentialIdStr),
                null, // userHandle
                authenticatorData,
                clientDataJSON,
                null, // clientExtensionsJSON
                signature
            );

            // Set authentication parameters
            AuthenticationParameters authParameters = new AuthenticationParameters(
                serverProperty,
                authenticator,
                null, // allowCredentials
                false, // userVerificationRequired
                false  // userPresenceRequired
            );

            // Validate authentication
            AuthenticationData authData = webAuthnManager.parse(authRequest);
            webAuthnManager.validate(authData, authParameters);

            // Update sign counter
            long newSignCount = authData.getAuthenticatorData().getSignCount();
            if (newSignCount > passkey.getSignCount()) {
                passkey.setSignCount(newSignCount);
            }
            passkey.setLastUsedAt(Instant.now());
            passkeyRepository.save(passkey);

            // Update user last login
            user.setLastLogin(Instant.now());
            userRepository.save(user);

            // Clear used challenge
            challengeStore.remove(challengeKey);

            auditService.log(user, "PASSKEY_LOGIN", "passkey", passkey.getId(), ip, userAgent);

            // Issue tokens
            return issueTokens(user);

        } catch (ValidationException e) {
            log.error("WebAuthn authentication validation failed", e);
            throw new BadCredentialsException("Passkey authentication failed: " + e.getMessage());
        } catch (BadCredentialsException e) {
            throw e;
        } catch (Exception e) {
            log.error("Passkey authentication error", e);
            throw new BadCredentialsException("Passkey authentication failed");
        }
    }

    // ============ Passkey Management ============

    @Transactional(readOnly = true)
    public PasskeyListResponse listPasskeys(Long userId) {
        List<PasskeyInfo> passkeys = passkeyRepository.findByUserId(userId).stream()
            .map(p -> PasskeyInfo.builder()
                .id(p.getId())
                .credentialId(p.getCredentialId())
                .name(p.getName())
                .createdAt(p.getCreatedAt() != null ? p.getCreatedAt().toString() : null)
                .lastUsedAt(p.getLastUsedAt() != null ? p.getLastUsedAt().toString() : null)
                .aaguid(p.getAaguid())
                .build())
            .collect(Collectors.toList());

        return new PasskeyListResponse(passkeys, passkeys.size());
    }

    @Transactional
    public void deletePasskey(Long userId, Long passkeyId) {
        Passkey passkey = passkeyRepository.findById(passkeyId)
            .orElseThrow(() -> new ResourceNotFoundException("Passkey not found"));

        if (!passkey.getUser().getId().equals(userId)) {
            throw new BadCredentialsException("Not authorized to delete this passkey");
        }

        User user = passkey.getUser();
        auditService.log(user, "PASSKEY_DELETE", "passkey", passkeyId, null, null);
        passkeyRepository.delete(passkey);
    }

    @Transactional
    public void renamePasskey(Long userId, Long passkeyId, String newName) {
        Passkey passkey = passkeyRepository.findById(passkeyId)
            .orElseThrow(() -> new ResourceNotFoundException("Passkey not found"));

        if (!passkey.getUser().getId().equals(userId)) {
            throw new BadCredentialsException("Not authorized to rename this passkey");
        }

        passkey.setName(newName);
        passkeyRepository.save(passkey);
    }

    // ============ Helper Methods ============

    private AuthDTOs.TokenResponse issueTokens(User user) {
        String accessToken = jwtTokenProvider.generateTokenForUser(user.getEmail());

        com.novapass.model.RefreshToken rt = new com.novapass.model.RefreshToken();
        rt.setUser(user);
        rt.setToken(UUID.randomUUID().toString());
        rt.setExpiresAt(Instant.now().plusMillis(604_800_000L)); // 7 days
        refreshTokenRepository.save(rt);

        return new AuthDTOs.TokenResponse(accessToken, rt.getToken(), jwtTokenProvider.getExpirationMs());
    }

    private List<String> parseTransports(String transportsJson) {
        if (transportsJson == null || transportsJson.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(transportsJson, 
                objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
        } catch (JsonProcessingException e) {
            return Collections.emptyList();
        }
    }

    private String toJson(List<String> list) {
        try {
            return objectMapper.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    // Challenge data holder
    private record ChallengeData(
        Long userId,
        byte[] challengeBytes,
        String userHandle,
        String passkeyName,
        long timestamp
    ) {}
}
