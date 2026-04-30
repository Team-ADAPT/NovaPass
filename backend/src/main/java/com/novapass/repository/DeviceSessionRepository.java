package com.novapass.repository;

import com.novapass.model.DeviceSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceSessionRepository extends JpaRepository<DeviceSession, Long> {
    
    Optional<DeviceSession> findByUserIdAndDeviceId(Long userId, String deviceId);
    
    List<DeviceSession> findByUserId(Long userId);
    
    @Query("SELECT d FROM DeviceSession d WHERE d.user.id = ?1 ORDER BY d.lastSyncAt DESC NULLS LAST")
    List<DeviceSession> findByUserIdOrderByLastSync(Long userId);
    
    int deleteByUserIdAndDeviceId(Long userId, String deviceId);
    
    @Query(value = "SELECT * FROM device_session WHERE user_id = ?1 AND last_sync_at IS NOT NULL ORDER BY last_sync_at DESC LIMIT 1", nativeQuery = true)
    Optional<DeviceSession> findLatestSyncedDevice(Long userId);
}
