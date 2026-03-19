package com.novapass.controller;

import com.novapass.dto.AdminDTOs.*;
import com.novapass.service.AdminService;
import com.novapass.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

    private final AdminService adminService;
    private final SecurityUtils securityUtils;

    // ===== Dashboard Stats =====

    @GetMapping("/stats")
    public ResponseEntity<SystemStats> getStats() {
        return ResponseEntity.ok(adminService.getSystemStats());
    }

    // ===== User Management =====

    @GetMapping("/users")
    public ResponseEntity<UserListResponse> listUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search
    ) {
        return ResponseEntity.ok(adminService.listUsers(page, size, search));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<UserDetail> getUserDetail(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getUserDetail(id));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<UserSummary> updateUser(
            @PathVariable Long id,
            @RequestBody UpdateUserRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long adminId = extractUserId(userDetails);
        return ResponseEntity.ok(adminService.updateUser(id, request, adminId));
    }

    @PostMapping("/users/{id}/logout")
    public ResponseEntity<AdminActionResponse> forceLogout(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long adminId = extractUserId(userDetails);
        adminService.forceLogout(id, adminId);
        return ResponseEntity.ok(new AdminActionResponse(true, "User logged out successfully"));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<AdminActionResponse> deleteUser(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long adminId = extractUserId(userDetails);
        adminService.deleteUser(id, adminId);
        return ResponseEntity.ok(new AdminActionResponse(true, "User deleted successfully"));
    }

    // ===== Audit Logs =====

    @GetMapping("/audit")
    public ResponseEntity<AuditLogResponse> listAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String action
    ) {
        return ResponseEntity.ok(adminService.listAuditLogs(page, size, userId, action));
    }

    // ===== Helper Methods =====

    private Long extractUserId(UserDetails userDetails) {
        return securityUtils.getUserId(userDetails);
    }
}
