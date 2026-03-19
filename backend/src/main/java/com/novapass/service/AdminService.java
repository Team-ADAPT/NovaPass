package com.novapass.service;

import com.novapass.dto.AdminDTOs.*;
import com.novapass.model.AuditLog;
import com.novapass.model.Role;
import com.novapass.model.User;
import com.novapass.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final UserRepository userRepository;
    private final VaultItemRepository vaultItemRepository;
    private final PasskeyRepository passkeyRepository;
    private final AuditLogRepository auditLogRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuditService auditService;

    // ===== User Management =====

    public UserListResponse listUsers(int page, int size, String search) {
        Pageable pageable = PageRequest.of(page, size);
        Page<User> userPage;
        
        if (search != null && !search.isBlank()) {
            userPage = userRepository.findByEmailContainingIgnoreCaseOrUsernameContainingIgnoreCaseOrderByCreatedAtDesc(
                    search, search, pageable);
        } else {
            userPage = userRepository.findAllByOrderByCreatedAtDesc(pageable);
        }

        List<UserSummary> users = userPage.getContent().stream()
                .map(this::toUserSummary)
                .collect(Collectors.toList());

        return new UserListResponse(
                users,
                page,
                size,
                userPage.getTotalElements(),
                userPage.getTotalPages()
        );
    }

    public UserDetail getUserDetail(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<AuditLog> recentLogs = auditLogRepository.findTop10ByUserIdOrderByCreatedAtDesc(userId);
        List<AuditLogEntry> recentActivity = recentLogs.stream()
                .map(this::toAuditLogEntry)
                .collect(Collectors.toList());

        return UserDetail.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .active(user.isActive())
                .twoFactorEnabled(user.isTwoFactorEnabled())
                .lastLogin(user.getLastLogin())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .vaultItemCount((int) vaultItemRepository.countByUserId(userId))
                .passkeyCount(passkeyRepository.countByUserId(userId))
                .recentActivity(recentActivity)
                .build();
    }

    @Transactional
    public UserSummary updateUser(Long userId, UpdateUserRequest request, Long adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (request.getActive() != null) {
            user.setActive(request.getActive());
            log.info("Admin {} {} user {}", adminId, request.getActive() ? "enabled" : "disabled", userId);
        }

        if (request.getRole() != null) {
            // Prevent demoting the last admin
            if (user.getRole() == Role.ADMIN && request.getRole() == Role.USER) {
                long adminCount = userRepository.countByRole(Role.ADMIN);
                if (adminCount <= 1) {
                    throw new IllegalArgumentException("Cannot remove the last admin");
                }
            }
            user.setRole(request.getRole());
            log.info("Admin {} changed role of user {} to {}", adminId, userId, request.getRole());
        }

        user = userRepository.save(user);
        
        auditService.log(adminId, "ADMIN_UPDATE_USER", "user", userId, null, null);

        return toUserSummary(user);
    }

    @Transactional
    public void forceLogout(Long userId, Long adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Delete all refresh tokens for this user
        refreshTokenRepository.deleteByUserId(userId);
        
        log.info("Admin {} forced logout for user {}", adminId, userId);
        auditService.log(adminId, "ADMIN_FORCE_LOGOUT", "user", userId, null, null);
    }

    @Transactional
    public void deleteUser(Long userId, Long adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Prevent deleting the last admin
        if (user.getRole() == Role.ADMIN) {
            long adminCount = userRepository.countByRole(Role.ADMIN);
            if (adminCount <= 1) {
                throw new IllegalArgumentException("Cannot delete the last admin");
            }
        }

        // Prevent self-deletion
        if (userId.equals(adminId)) {
            throw new IllegalArgumentException("Cannot delete your own account");
        }

        userRepository.delete(user);
        log.info("Admin {} deleted user {}", adminId, userId);
        auditService.log(adminId, "ADMIN_DELETE_USER", "user", userId, null, null);
    }

    // ===== Audit Logs =====

    public AuditLogResponse listAuditLogs(int page, int size, Long userId, String action) {
        Pageable pageable = PageRequest.of(page, size);
        Page<AuditLog> logPage;

        if (userId != null && action != null) {
            logPage = auditLogRepository.findByUserIdAndActionOrderByCreatedAtDesc(userId, action, pageable);
        } else if (userId != null) {
            logPage = auditLogRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        } else if (action != null) {
            logPage = auditLogRepository.findByActionOrderByCreatedAtDesc(action, pageable);
        } else {
            logPage = auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
        }

        List<AuditLogEntry> logs = logPage.getContent().stream()
                .map(this::toAuditLogEntry)
                .collect(Collectors.toList());

        return new AuditLogResponse(
                logs,
                page,
                size,
                logPage.getTotalElements(),
                logPage.getTotalPages()
        );
    }

    // ===== System Stats =====

    public SystemStats getSystemStats() {
        Instant todayStart = LocalDate.now().atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant last30Days = Instant.now().minusSeconds(30 * 24 * 60 * 60);

        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByActive(true);
        long usersWithTwoFactor = userRepository.countByTwoFactorEnabled(true);
        long totalVaultItems = vaultItemRepository.count();
        long totalPasskeys = passkeyRepository.count();
        long loginsToday = auditLogRepository.countByActionSince("LOGIN", todayStart);
        long registrationsToday = auditLogRepository.countByActionSince("REGISTER", todayStart);

        // Get daily login stats for last 30 days
        List<DailyStatPoint> dailyLogins = getDailyStats("LOGIN", last30Days);
        List<DailyStatPoint> dailyRegistrations = getDailyStats("REGISTER", last30Days);

        return SystemStats.builder()
                .totalUsers(totalUsers)
                .activeUsers(activeUsers)
                .usersWithTwoFactor(usersWithTwoFactor)
                .totalVaultItems(totalVaultItems)
                .totalPasskeys(totalPasskeys)
                .loginsToday(loginsToday)
                .registrationsToday(registrationsToday)
                .dailyLogins(dailyLogins)
                .dailyRegistrations(dailyRegistrations)
                .build();
    }

    private List<DailyStatPoint> getDailyStats(String action, Instant since) {
        List<Object[]> rawStats = auditLogRepository.countByActionGroupedByDay(action, since);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        
        return rawStats.stream()
                .map(row -> DailyStatPoint.builder()
                        .date(row[0].toString())
                        .count(((Number) row[1]).longValue())
                        .build())
                .collect(Collectors.toList());
    }

    // ===== Helper Methods =====

    private UserSummary toUserSummary(User user) {
        return UserSummary.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .active(user.isActive())
                .twoFactorEnabled(user.isTwoFactorEnabled())
                .lastLogin(user.getLastLogin())
                .createdAt(user.getCreatedAt())
                .vaultItemCount((int) vaultItemRepository.countByUserId(user.getId()))
                .passkeyCount(passkeyRepository.countByUserId(user.getId()))
                .build();
    }

    private AuditLogEntry toAuditLogEntry(AuditLog log) {
        String userEmail = null;
        if (log.getUser() != null) {
            userEmail = log.getUser().getEmail();
        }

        return AuditLogEntry.builder()
                .id(log.getId())
                .userId(log.getUser() != null ? log.getUser().getId() : null)
                .userEmail(userEmail)
                .action(log.getAction())
                .resourceType(log.getResourceType())
                .resourceId(log.getResourceId())
                .ipAddress(log.getIpAddress())
                .userAgent(log.getUserAgent())
                .details(log.getDetails())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
