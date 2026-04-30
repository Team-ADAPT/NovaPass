package com.novapass.service;

import com.novapass.dto.SyncDTOs;
import com.novapass.dto.VaultDTOs;
import com.novapass.exception.ConflictException;
import com.novapass.exception.ResourceNotFoundException;
import com.novapass.model.DeviceSession;
import com.novapass.model.SyncLog;
import com.novapass.model.User;
import com.novapass.model.VaultItem;
import com.novapass.repository.DeviceSessionRepository;
import com.novapass.repository.SyncLogRepository;
import com.novapass.repository.UserRepository;
import com.novapass.repository.VaultItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SyncService {

    private final DeviceSessionRepository deviceSessionRepository;
    private final SyncLogRepository syncLogRepository;
    private final VaultItemRepository vaultItemRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    @Transactional
    public SyncDTOs.EnhancedSyncResponse sync(Long userId, String deviceId, SyncDTOs.EnhancedSyncRequest req) {
        User user = userRepository.getReferenceById(userId);
        
        // Update or create device session
        DeviceSession device = deviceSessionRepository
            .findByUserIdAndDeviceId(userId, deviceId)
            .orElse(new DeviceSession());
        
        if (device.getId() == null) {
            device.setUser(user);
            device.setDeviceId(deviceId);
            device.setDeviceName("Unknown Device");
            device.setDeviceType("web");
        }
        
        device.setLastSyncAt(Instant.now());
        DeviceSession savedDevice = deviceSessionRepository.save(device);

        Instant syncSince = (req != null && req.getLastSyncAt() != null) ? req.getLastSyncAt() : Instant.EPOCH;
        
        // Fetch updated items since last sync
        List<VaultItem> updated = vaultItemRepository
            .findByUserIdAndUpdatedAtAfter(userId, syncSince);
        
        List<VaultDTOs.ItemResponse> updatedResponses = updated.stream()
            .map(this::toResponse)
            .collect(Collectors.toList());

        // Log successful sync
        syncLogRepository.save(new SyncLog(
            userId,
            deviceId,
            "SYNC_SUCCESS",
            null,
            false,
            "Synced " + updated.size() + " items"
        ));

        SyncDTOs.EnhancedSyncResponse response = new SyncDTOs.EnhancedSyncResponse();
        response.setUpdated(updatedResponses);
        response.setDeletedIds(new ArrayList<>());
        response.setConflicts(new ArrayList<>());
        response.setSyncedAt(Instant.now());
        response.setSyncStatus("SUCCESS");
        
        return response;
    }

    @Transactional
    public void resolveConflict(Long userId, Long itemId, SyncDTOs.ResolveConflictRequest req) {
        VaultItem item = vaultItemRepository
            .findByIdAndUserId(itemId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Vault item not found"));

        String resolution = req.getResolution();
        
        if ("USE_CLIENT".equals(resolution)) {
            // Update with client version
            item.setEncryptedData(req.getMergedEncryptedData());
            item.setVersion(item.getVersion() + 1);
            vaultItemRepository.save(item);
            
            syncLogRepository.save(new SyncLog(
                userId,
                "unknown",
                "CONFLICT_RESOLVED",
                itemId,
                false,
                "Resolution: USE_CLIENT"
            ));
            
            auditService.log(userId, "CONFLICT_RESOLVED", "vault_item", itemId, 
                "USE_CLIENT", "Resolved using client version");
                
        } else if ("USE_SERVER".equals(resolution)) {
            syncLogRepository.save(new SyncLog(
                userId,
                "unknown",
                "CONFLICT_RESOLVED",
                itemId,
                false,
                "Resolution: USE_SERVER"
            ));
            
            auditService.log(userId, "CONFLICT_RESOLVED", "vault_item", itemId, 
                "USE_SERVER", "Resolved using server version");
                
        } else if ("MERGE".equals(resolution)) {
            item.setEncryptedData(req.getMergedEncryptedData());
            item.setVersion(item.getVersion() + 1);
            vaultItemRepository.save(item);
            
            syncLogRepository.save(new SyncLog(
                userId,
                "unknown",
                "CONFLICT_RESOLVED",
                itemId,
                false,
                "Resolution: MERGE"
            ));
            
            auditService.log(userId, "CONFLICT_RESOLVED", "vault_item", itemId, 
                "MERGE", "Resolved using merged version");
        }
        
        log.info("Conflict resolved for item {} with resolution {}", itemId, resolution);
    }

    @Transactional(readOnly = true)
    public List<DeviceSession> getDevices(Long userId) {
        return deviceSessionRepository.findByUserIdOrderByLastSync(userId);
    }

    @Transactional
    public void registerDevice(Long userId, SyncDTOs.RegisterDeviceRequest req) {
        User user = userRepository.getReferenceById(userId);
        
        DeviceSession device = deviceSessionRepository
            .findByUserIdAndDeviceId(userId, req.getDeviceId())
            .orElse(new DeviceSession());
        
        device.setUser(user);
        device.setDeviceId(req.getDeviceId());
        device.setDeviceName(req.getDeviceName());
        device.setDeviceType(req.getDeviceType());
        
        if (device.getId() == null) {
            device.setCreatedAt(Instant.now());
        }
        device.setUpdatedAt(Instant.now());
        
        deviceSessionRepository.save(device);
        
        auditService.log(userId, "DEVICE_REGISTERED", "device_session", 
            null, req.getDeviceId(), "Device: " + req.getDeviceName());
        
        log.info("Device {} registered for user {}", req.getDeviceId(), userId);
    }

    @Transactional
    public void unregisterDevice(Long userId, String deviceId) {
        int deleted = deviceSessionRepository.deleteByUserIdAndDeviceId(userId, deviceId);
        
        if (deleted > 0) {
            auditService.log(userId, "DEVICE_UNREGISTERED", "device_session", 
                null, deviceId, "Device unregistered");
            log.info("Device {} unregistered for user {}", deviceId, userId);
        }
    }

    @Transactional(readOnly = true)
    public List<SyncLog> getSyncHistory(Long userId) {
        return syncLogRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public List<SyncLog> getConflicts(Long userId) {
        return syncLogRepository.findByUserIdAndConflictDetectedTrue(userId);
    }

    // Helper: Convert VaultItem to DTO response
    private VaultDTOs.ItemResponse toResponse(VaultItem item) {
        VaultDTOs.ItemResponse r = new VaultDTOs.ItemResponse();
        r.setId(item.getId());
        r.setItemType(item.getItemType());
        r.setTitle(item.getTitle());
        r.setEncryptedData(item.getEncryptedData());
        r.setUrl(item.getUrl());
        r.setFavorite(item.isFavorite());
        r.setVersion(item.getVersion());
        r.setCreatedAt(item.getCreatedAt());
        r.setUpdatedAt(item.getUpdatedAt());
        return r;
    }
}
