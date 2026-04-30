package com.novapass.service;

import com.novapass.dto.AuthDTOs.*;
import com.novapass.exception.ConflictException;
import com.novapass.exception.ResourceNotFoundException;
import com.novapass.model.RefreshToken;
import com.novapass.model.Role;
import com.novapass.model.User;
import com.novapass.repository.RefreshTokenRepository;
import com.novapass.repository.UserRepository;
import com.novapass.security.JwtTokenProvider;
import de.mkammerer.argon2.Argon2;
import de.mkammerer.argon2.Argon2Factory;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final TotpService totpService;
    private final AuditService auditService;

    @Value("${spring.security.jwt.refresh-expiration}")
    private long refreshExpirationMs;

    private static final Argon2 ARGON2 = Argon2Factory.createAdvanced(Argon2Factory.Argon2Types.ARGON2id);

    @Transactional
    public TokenResponse register(RegisterRequest req) {
        String email = req.getEmail().toLowerCase().trim();
        if (userRepository.existsByEmail(email))
            throw new ConflictException("Email already registered");
        if (userRepository.existsByUsername(req.getUsername()))
            throw new ConflictException("Username already taken");

        User user = new User();
        user.setUsername(req.getUsername());
        user.setEmail(email);
        user.setRole(Role.USER);
        // Store Argon2 hash of the auth key (not the raw master password)
        user.setPasswordHash(ARGON2.hash(3, 65536, 4, req.getAuthKey().toCharArray()));
        user.setMasterKeyHash(req.getMasterKeyHash());
        user.setSalt(req.getSalt());
        userRepository.save(user);

        auditService.log(user, "REGISTER", "user", user.getId(), null, null);
        return issueTokens(user);
    }

    @Transactional
    public TokenResponse login(LoginRequest req, String ip, String userAgent) {
        String email = req.getEmail().toLowerCase().trim();
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        if (!user.isActive())
            throw new BadCredentialsException("Account disabled");

        if (!ARGON2.verify(user.getPasswordHash(), req.getAuthKey().toCharArray()))
            throw new BadCredentialsException("Invalid credentials");

        if (user.isTwoFactorEnabled()) {
            if (req.getTotpCode() == null || !totpService.verify(user.getTwoFactorSecret(), req.getTotpCode())) {
                TokenResponse partial = new TokenResponse(null, null, 0);
                partial.setRequiresTwoFactor(true);
                return partial;
            }
        }

        ensureRole(user, false);
        user.setLastLogin(Instant.now());
        userRepository.save(user);
        auditService.log(user, "LOGIN", "user", user.getId(), ip, userAgent);
        return issueTokens(user);
    }

    @Transactional
    public TokenResponse refresh(String rawToken) {
        RefreshToken rt = refreshTokenRepository.findByToken(rawToken)
            .orElseThrow(() -> new BadCredentialsException("Invalid refresh token"));

        if (rt.getExpiresAt().isBefore(Instant.now())) {
            refreshTokenRepository.delete(rt);
            throw new BadCredentialsException("Refresh token expired");
        }

        // Rotate: delete old, issue new
        refreshTokenRepository.delete(rt);
        return issueTokens(rt.getUser());
    }

    @Transactional
    public void logout(Long userId) {
        refreshTokenRepository.deleteByUserId(userId);
    }

    public SaltResponse getSalt(String email) {
        String cleanedEmail = email.toLowerCase().trim();
        User user = userRepository.findByEmail(cleanedEmail)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return new SaltResponse(user.getSalt(), user.isTwoFactorEnabled());
    }

    // --- 2FA ---

    @Transactional
    public TwoFactorSetupResponse setup2FA(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        String secret = totpService.generateSecret();
        user.setTwoFactorSecret(secret);
        userRepository.save(user);
        String qrUri = totpService.getQrCodeUri(user.getEmail(), secret);
        return new TwoFactorSetupResponse(secret, qrUri);
    }

    @Transactional
    public void confirm2FA(Long userId, String code) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (!totpService.verify(user.getTwoFactorSecret(), code))
            throw new BadCredentialsException("Invalid TOTP code");
        user.setTwoFactorEnabled(true);
        userRepository.save(user);
    }

    @Transactional
    public void disable2FA(Long userId, String code) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (!totpService.verify(user.getTwoFactorSecret(), code))
            throw new BadCredentialsException("Invalid TOTP code");
        user.setTwoFactorEnabled(false);
        user.setTwoFactorSecret(null);
        userRepository.save(user);
    }

    // --- Private helpers ---

    private TokenResponse issueTokens(User user) {
        Role role = ensureRole(user, true);
        String accessToken = jwtTokenProvider.generateTokenForUser(user.getId(), user.getEmail(), role);

        RefreshToken rt = new RefreshToken();
        rt.setUser(user);
        rt.setToken(UUID.randomUUID().toString());
        rt.setExpiresAt(Instant.now().plusMillis(refreshExpirationMs));
        refreshTokenRepository.save(rt);

        return new TokenResponse(accessToken, rt.getToken(), jwtTokenProvider.getExpirationMs());
    }

    private Role ensureRole(User user, boolean persistIfMissing) {
        if (user.getRole() == null) {
            user.setRole(Role.USER);
            if (persistIfMissing) {
                userRepository.save(user);
            }
        }
        return user.getRole();
    }
}
