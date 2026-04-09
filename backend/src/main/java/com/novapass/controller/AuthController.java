package com.novapass.controller;

import com.novapass.dto.AuthDTOs.*;
import com.novapass.service.AuthService;
import com.novapass.util.SecurityUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final SecurityUtils securityUtils;

    @PostMapping("/register")
    public ResponseEntity<TokenResponse> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest req,
                                               HttpServletRequest httpReq) {
        return ResponseEntity.ok(authService.login(req,
            httpReq.getRemoteAddr(), httpReq.getHeader("User-Agent")));
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@Valid @RequestBody RefreshRequest req) {
        return ResponseEntity.ok(authService.refresh(req.getRefreshToken()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal UserDetails userDetails) {
        authService.logout(securityUtils.getUserId(userDetails));
        return ResponseEntity.noContent().build();
    }

    // Client calls this first to get the salt needed for key derivation
    @GetMapping("/salt")
    public ResponseEntity<SaltResponse> getSalt(@RequestParam("email") String email) {
        return ResponseEntity.ok(authService.getSalt(email));
    }

    // --- 2FA endpoints ---

    @PostMapping("/2fa/setup")
    public ResponseEntity<TwoFactorSetupResponse> setup2FA(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(authService.setup2FA(securityUtils.getUserId(userDetails)));
    }

    @PostMapping("/2fa/confirm")
    public ResponseEntity<Void> confirm2FA(@AuthenticationPrincipal UserDetails userDetails,
                                           @Valid @RequestBody TwoFactorVerifyRequest req) {
        authService.confirm2FA(securityUtils.getUserId(userDetails), req.getCode());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/2fa/disable")
    public ResponseEntity<Void> disable2FA(@AuthenticationPrincipal UserDetails userDetails,
                                           @Valid @RequestBody TwoFactorVerifyRequest req) {
        authService.disable2FA(securityUtils.getUserId(userDetails), req.getCode());
        return ResponseEntity.ok().build();
    }
}
