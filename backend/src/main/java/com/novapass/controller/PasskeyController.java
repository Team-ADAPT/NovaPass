package com.novapass.controller;

import com.novapass.dto.AuthDTOs.TokenResponse;
import com.novapass.dto.PasskeyDTOs.*;
import com.novapass.service.PasskeyService;
import com.novapass.util.SecurityUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth/passkey")
@RequiredArgsConstructor
public class PasskeyController {

    private final PasskeyService passkeyService;
    private final SecurityUtils securityUtils;

    // ============ Registration Flow ============

    /**
     * Begin passkey registration for authenticated user.
     * Returns WebAuthn options for navigator.credentials.create()
     */
    @PostMapping("/register/begin")
    public ResponseEntity<PasskeyRegistrationBeginResponse> beginRegistration(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody(required = false) PasskeyRegistrationBeginRequest request) {

        Long userId = securityUtils.getUserId(userDetails);
        String passkeyName = request != null ? request.getPasskeyName() : null;

        return ResponseEntity.ok(passkeyService.beginRegistration(userId, passkeyName));
    }

    /**
     * Complete passkey registration.
     * Validates attestation and stores the credential.
     */
    @PostMapping("/register/complete")
    public ResponseEntity<PasskeyRegistrationCompleteResponse> completeRegistration(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PasskeyRegistrationCompleteRequest request) {

        Long userId = securityUtils.getUserId(userDetails);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(passkeyService.completeRegistration(userId, request));
    }

    // ============ Authentication Flow ============

    /**
     * Begin passkey authentication.
     * Returns WebAuthn options for navigator.credentials.get()
     * Email is optional - if not provided, allows discoverable credentials (resident keys)
     */
    @PostMapping("/login/begin")
    public ResponseEntity<PasskeyAuthBeginResponse> beginAuthentication(
            @RequestBody(required = false) PasskeyAuthBeginRequest request) {

        String email = request != null ? request.getEmail() : null;
        return ResponseEntity.ok(passkeyService.beginAuthentication(email));
    }

    /**
     * Complete passkey authentication.
     * Validates assertion and returns access/refresh tokens.
     */
    @PostMapping("/login/complete")
    public ResponseEntity<TokenResponse> completeAuthentication(
            @Valid @RequestBody PasskeyAuthCompleteRequest request,
            HttpServletRequest httpReq) {

        return ResponseEntity.ok(passkeyService.completeAuthentication(
            request,
            httpReq.getRemoteAddr(),
            httpReq.getHeader("User-Agent")
        ));
    }

    // ============ Passkey Management ============

    /**
     * List all passkeys for the authenticated user.
     */
    @GetMapping
    public ResponseEntity<PasskeyListResponse> listPasskeys(
            @AuthenticationPrincipal UserDetails userDetails) {

        Long userId = securityUtils.getUserId(userDetails);
        return ResponseEntity.ok(passkeyService.listPasskeys(userId));
    }

    /**
     * Delete a passkey.
     */
    @DeleteMapping("/{passkeyId}")
    public ResponseEntity<Void> deletePasskey(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long passkeyId) {

        Long userId = securityUtils.getUserId(userDetails);
        passkeyService.deletePasskey(userId, passkeyId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Rename a passkey.
     */
    @PutMapping("/{passkeyId}/name")
    public ResponseEntity<Map<String, String>> renamePasskey(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long passkeyId,
            @Valid @RequestBody PasskeyRenameRequest request) {

        Long userId = securityUtils.getUserId(userDetails);
        passkeyService.renamePasskey(userId, passkeyId, request.getNewName());
        return ResponseEntity.ok(Map.of("message", "Passkey renamed successfully"));
    }
}
