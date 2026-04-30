package com.novapass.repository;

import com.novapass.model.SyncLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface SyncLogRepository extends JpaRepository<SyncLog, Long> {
    
    List<SyncLog> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    List<SyncLog> findByUserIdAndVaultItemIdOrderByCreatedAtDesc(Long userId, Long vaultItemId);
    
    List<SyncLog> findByUserIdAndConflictDetectedTrue(Long userId);
    
    List<SyncLog> findByUserIdAndCreatedAtAfter(Long userId, Instant since);
}
