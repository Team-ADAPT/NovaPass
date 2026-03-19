package com.novapass.dto;

import com.novapass.model.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

public class AdminDTOs {

    // ===== User Management DTOs =====

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserSummary {
        private Long id;
        private String username;
        private String email;
        private Role role;
        private boolean active;
        private boolean twoFactorEnabled;
        private Instant lastLogin;
        private Instant createdAt;
        private int vaultItemCount;
        private int passkeyCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserDetail {
        private Long id;
        private String username;
        private String email;
        private Role role;
        private boolean active;
        private boolean twoFactorEnabled;
        private Instant lastLogin;
        private Instant createdAt;
        private Instant updatedAt;
        private int vaultItemCount;
        private int passkeyCount;
        private List<AuditLogEntry> recentActivity;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserListResponse {
        private List<UserSummary> users;
        private int page;
        private int pageSize;
        private long totalElements;
        private int totalPages;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateUserRequest {
        private Boolean active;
        private Role role;
    }

    // ===== Audit Log DTOs =====

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuditLogEntry {
        private Long id;
        private Long userId;
        private String userEmail;
        private String action;
        private String resourceType;
        private Long resourceId;
        private String ipAddress;
        private String userAgent;
        private String details;
        private Instant createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuditLogResponse {
        private List<AuditLogEntry> logs;
        private int page;
        private int pageSize;
        private long totalElements;
        private int totalPages;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuditLogFilter {
        private Long userId;
        private String action;
        private String resourceType;
        private Instant startDate;
        private Instant endDate;
    }

    // ===== System Stats DTOs =====

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SystemStats {
        private long totalUsers;
        private long activeUsers;
        private long usersWithTwoFactor;
        private long totalVaultItems;
        private long totalPasskeys;
        private long loginsToday;
        private long registrationsToday;
        private List<DailyStatPoint> dailyLogins;
        private List<DailyStatPoint> dailyRegistrations;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyStatPoint {
        private String date;
        private long count;
    }

    // ===== Response Messages =====

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdminActionResponse {
        private boolean success;
        private String message;
    }
}
