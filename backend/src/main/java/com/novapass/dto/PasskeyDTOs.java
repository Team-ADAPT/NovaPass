package com.novapass.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

public class PasskeyDTOs {

    // ============ Registration Flow ============

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PasskeyRegistrationBeginRequest {
        private String passkeyName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PasskeyRegistrationBeginResponse {
        private String challenge;
        private RelyingParty rp;
        private UserInfo user;
        private List<PubKeyCredParam> pubKeyCredParams;
        private Long timeout;
        private String attestation;
        private AuthenticatorSelection authenticatorSelection;
        private List<ExcludeCredential> excludeCredentials;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RelyingParty {
        private String id;
        private String name;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInfo {
        private String id;
        private String name;
        private String displayName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PubKeyCredParam {
        private String type;
        private Long alg;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuthenticatorSelection {
        private String authenticatorAttachment;
        private Boolean requireResidentKey;
        private String residentKey;
        private String userVerification;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExcludeCredential {
        private String id;
        private String type;
        private List<String> transports;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PasskeyRegistrationCompleteRequest {
        @NotBlank
        private String id;
        @NotBlank
        private String rawId;
        @NotNull
        private AuthenticatorAttestationResponse response;
        private String type;
        private String passkeyName;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuthenticatorAttestationResponse {
        @NotBlank
        private String clientDataJSON;
        @NotBlank
        private String attestationObject;
        private List<String> transports;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PasskeyRegistrationCompleteResponse {
        private Long passkeyId;
        private String credentialId;
        private String name;
        private String message;
    }

    // ============ Authentication Flow ============

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PasskeyAuthBeginRequest {
        private String email;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PasskeyAuthBeginResponse {
        private String challenge;
        private Long timeout;
        private String rpId;
        private List<AllowCredential> allowCredentials;
        private String userVerification;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AllowCredential {
        private String id;
        private String type;
        private List<String> transports;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PasskeyAuthCompleteRequest {
        @NotBlank
        private String id;
        @NotBlank
        private String rawId;
        @NotNull
        private AuthenticatorAssertionResponse response;
        private String type;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuthenticatorAssertionResponse {
        @NotBlank
        private String clientDataJSON;
        @NotBlank
        private String authenticatorData;
        @NotBlank
        private String signature;
        private String userHandle;
    }

    // ============ Passkey Management ============

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PasskeyInfo {
        private Long id;
        private String credentialId;
        private String name;
        private String createdAt;
        private String lastUsedAt;
        private String aaguid;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PasskeyListResponse {
        private List<PasskeyInfo> passkeys;
        private int count;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PasskeyDeleteRequest {
        @NotNull
        private Long passkeyId;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PasskeyRenameRequest {
        @NotNull
        private Long passkeyId;
        @NotBlank
        private String newName;
    }
}
