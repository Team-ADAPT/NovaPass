package com.novapass.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "sync_log", indexes = {
    @Index(name = "idx_sync_log_user", columnList = "user_id"),
    @Index(name = "idx_sync_log_vault_item", columnList = "vault_item_id"),
    @Index(name = "idx_sync_log_created", columnList = "created_at DESC")
})
@Data
@NoArgsConstructor
public class SyncLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "device_id", nullable = false, length = 64)
    private String deviceId;

    @Column(nullable = false, length = 50)
    private String operation; // 'CREATE', 'UPDATE', 'DELETE', 'CONFLICT_RESOLVED'

    @Column(name = "vault_item_id")
    private Long vaultItemId;

    @Column(name = "conflict_detected")
    private Boolean conflictDetected = false;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public SyncLog(Long userId, String deviceId, String operation, Long vaultItemId, Boolean conflictDetected, String notes) {
        this.userId = userId;
        this.deviceId = deviceId;
        this.operation = operation;
        this.vaultItemId = vaultItemId;
        this.conflictDetected = conflictDetected;
        this.notes = notes;
    }
}
