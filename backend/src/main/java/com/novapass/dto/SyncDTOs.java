package com.novapass.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.Instant;
import java.util.List;

public class SyncDTOs {

    @Data
    public static class RegisterDeviceRequest {
        @NotBlank
        private String deviceId;

        @NotBlank
        private String deviceName;

        @NotBlank
        private String deviceType; // 'web', 'desktop', 'mobile', 'extension'
    }

    @Data
    public static class DeviceResponse {
        private Long id;
        private String deviceId;
        private String deviceName;
        private String deviceType;
        private Instant lastSyncAt;
        private Instant createdAt;
        private Instant updatedAt;
    }

    @Data
    public static class EnhancedSyncRequest {
        private String deviceId;
        private Instant lastSyncAt;
    }

    @Data
    public static class ConflictInfo {
        private Long vaultItemId;
        private String clientVersion;
        private String serverVersion;
        private Instant clientUpdatedAt;
        private Instant serverUpdatedAt;
        private String clientEncryptedData;
        private String serverEncryptedData;
        private String conflict_type; // 'VERSION_MISMATCH', 'CONCURRENT_UPDATE'
    }

    @Data
    public static class ResolveConflictRequest {
        private Long vaultItemId;
        private String resolution; // 'USE_CLIENT', 'USE_SERVER', 'MERGE'
        private String mergedEncryptedData; // If using MERGE strategy
    }

    @Data
    public static class EnhancedSyncResponse {
        private List<VaultDTOs.ItemResponse> updated;
        private List<Long> deletedIds;
        private List<ConflictInfo> conflicts;
        private Instant syncedAt;
        private String syncStatus; // 'SUCCESS', 'PARTIAL', 'CONFLICT_DETECTED'
    }
}
