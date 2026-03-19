package com.novapass.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

public class AuthDTOs {

    @Data
    public static class RegisterRequest {
        @NotBlank @Size(min = 3, max = 50)
        private String username;

        @NotBlank @Email
        private String email;

        // Argon2-derived auth key (hex), NOT the raw master password
        @NotBlank
        private String authKey;

        // Argon2-derived master key hash for server-side verification
        @NotBlank
        private String masterKeyHash;

        // Hex-encoded salt generated client-side
        @NotBlank
        private String salt;
    }

    @Data
    public static class LoginRequest {
        @NotBlank @Email
        private String email;

        @NotBlank
        private String authKey;

        private String totpCode; // optional, required if 2FA enabled
    }

    @Data
    public static class TokenResponse {
        private String accessToken;
        private String refreshToken;
        private long expiresIn;
        private boolean requiresTwoFactor;

        public TokenResponse(String accessToken, String refreshToken, long expiresIn) {
            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
            this.expiresIn = expiresIn;
            this.requiresTwoFactor = false;
        }
    }

    @Data
    public static class RefreshRequest {
        @NotBlank
        private String refreshToken;
    }

    @Data
    public static class SaltResponse {
        private String salt;
        private boolean twoFactorEnabled;

        public SaltResponse(String salt, boolean twoFactorEnabled) {
            this.salt = salt;
            this.twoFactorEnabled = twoFactorEnabled;
        }
    }

    @Data
    public static class TwoFactorSetupResponse {
        private String secret;
        private String qrCodeUri;

        public TwoFactorSetupResponse(String secret, String qrCodeUri) {
            this.secret = secret;
            this.qrCodeUri = qrCodeUri;
        }
    }

    @Data
    public static class TwoFactorVerifyRequest {
        @NotBlank
        private String code;
    }
}
