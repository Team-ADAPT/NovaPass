package com.novapass.controller;

import com.novapass.dto.SyncDTOs;
import com.novapass.security.JwtTokenProvider;
import com.novapass.service.SyncService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sync")
@RequiredArgsConstructor
public class SyncController {

    private final SyncService syncService;
    private final JwtTokenProvider jwtTokenProvider;

    /**
     * Register a new device for the authenticated user
     */
    @PostMapping("/devices/register")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> registerDevice(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody SyncDTOs.RegisterDeviceRequest req) {
        
        Long userId = extractUserId(authHeader);
        syncService.registerDevice(userId, req);
        
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    /**
     * Unregister a device
     */
    @PostMapping("/devices/unregister/{deviceId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> unregisterDevice(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String deviceId) {
        
        Long userId = extractUserId(authHeader);
        syncService.unregisterDevice(userId, deviceId);
        
        return ResponseEntity.noContent().build();
    }

    /**
     * List all active devices for the user
     */
    @GetMapping("/devices")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<SyncDTOs.DeviceResponse>> listDevices(
            @RequestHeader("Authorization") String authHeader) {
        
        Long userId = extractUserId(authHeader);
        List<SyncDTOs.DeviceResponse> devices = syncService.getDevices(userId)
            .stream()
            .map(d -> {
                SyncDTOs.DeviceResponse r = new SyncDTOs.DeviceResponse();
                r.setId(d.getId());
                r.setDeviceId(d.getDeviceId());
                r.setDeviceName(d.getDeviceName());
                r.setDeviceType(d.getDeviceType());
                r.setLastSyncAt(d.getLastSyncAt());
                r.setCreatedAt(d.getCreatedAt());
                r.setUpdatedAt(d.getUpdatedAt());
                return r;
            })
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(devices);
    }

    /**
     * Resolve a sync conflict
     */
    @PostMapping("/conflicts/{itemId}/resolve")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> resolveConflict(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long itemId,
            @Valid @RequestBody SyncDTOs.ResolveConflictRequest req) {
        
        Long userId = extractUserId(authHeader);
        syncService.resolveConflict(userId, itemId, req);
        
        return ResponseEntity.ok().build();
    }

    /**
     * Get sync history (audit trail)
     */
    @GetMapping("/history")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Object>> getSyncHistory(
            @RequestHeader("Authorization") String authHeader) {
        
        Long userId = extractUserId(authHeader);
        List<Object> history = syncService.getSyncHistory(userId)
            .stream()
            .map(log -> java.util.Map.of(
                "id", log.getId(),
                "operation", log.getOperation(),
                "deviceId", log.getDeviceId(),
                "vaultItemId", log.getVaultItemId(),
                "conflictDetected", log.getConflictDetected(),
                "notes", log.getNotes(),
                "createdAt", log.getCreatedAt()
            ))
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(history);
    }

    /**
     * Get all conflicts detected
     */
    @GetMapping("/conflicts")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Object>> getConflicts(
            @RequestHeader("Authorization") String authHeader) {
        
        Long userId = extractUserId(authHeader);
        List<Object> conflicts = syncService.getConflicts(userId)
            .stream()
            .map(log -> java.util.Map.of(
                "id", log.getId(),
                "deviceId", log.getDeviceId(),
                "vaultItemId", log.getVaultItemId(),
                "notes", log.getNotes(),
                "createdAt", log.getCreatedAt()
            ))
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(conflicts);
    }

    /**
     * Enhanced sync with device tracking and conflict detection
     */
    @PostMapping("/vault")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<SyncDTOs.EnhancedSyncResponse> sync(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody SyncDTOs.EnhancedSyncRequest req) {
        
        Long userId = extractUserId(authHeader);
        SyncDTOs.EnhancedSyncResponse response = syncService.sync(userId, req.getDeviceId(), req);
        
        return ResponseEntity.ok(response);
    }

    private Long extractUserId(String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        return jwtTokenProvider.getUserIdFromToken(token);
    }
}
