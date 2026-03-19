package com.novapass.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.Instant;

public class VaultDTOs {

    @Data
    public static class CreateItemRequest {
        @NotBlank
        private String itemType;

        @NotBlank
        private String title;

        // AES-256-GCM ciphertext (base64) — encrypted client-side
        @NotBlank
        private String encryptedData;

        private String url;
        private boolean favorite;
    }

    @Data
    public static class UpdateItemRequest {
        private String title;

        @NotBlank
        private String encryptedData;

        // Client sends its known version; server rejects if stale (optimistic locking)
        @NotNull
        private Long version;

        private String url;
        private boolean favorite;
    }

    @Data
    public static class ItemResponse {
        private Long id;
        private String itemType;
        private String title;
        private String encryptedData;
        private String url;
        private boolean favorite;
        private Long version;
        private Instant createdAt;
        private Instant updatedAt;
    }

    @Data
    public static class SyncRequest {
        // Client sends timestamp of its last successful sync
        private Instant lastSyncAt;
    }

    @Data
    public static class SyncResponse {
        private java.util.List<ItemResponse> updated;
        private java.util.List<Long> deletedIds;
        private Instant syncedAt;
    }
}
