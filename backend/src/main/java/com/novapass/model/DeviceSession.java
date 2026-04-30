package com.novapass.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "device_session", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "device_id"})
}, indexes = {
    @Index(name = "idx_device_session_user", columnList = "user_id"),
    @Index(name = "idx_device_session_sync", columnList = "user_id,last_sync_at DESC")
})
@Data
@NoArgsConstructor
public class DeviceSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 64)
    private String deviceId;

    @Column(name = "device_name", length = 255)
    private String deviceName;

    @Column(name = "device_type", length = 50)
    private String deviceType; // 'web', 'desktop', 'mobile', 'extension'

    @Column(name = "last_sync_at")
    private Instant lastSyncAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
