package com.novapass.repository;

import com.novapass.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<AuditLog> findByActionOrderByCreatedAtDesc(String action, Pageable pageable);
    Page<AuditLog> findByUserIdAndActionOrderByCreatedAtDesc(Long userId, String action, Pageable pageable);
    
    List<AuditLog> findTop10ByUserIdOrderByCreatedAtDesc(Long userId);
    
    @Query("SELECT COUNT(a) FROM AuditLog a WHERE a.action = :action AND a.createdAt >= :since")
    long countByActionSince(@Param("action") String action, @Param("since") Instant since);
    
    @Query("SELECT CAST(a.createdAt AS date) as day, COUNT(a) FROM AuditLog a " +
           "WHERE a.action = :action AND a.createdAt >= :since " +
           "GROUP BY CAST(a.createdAt AS date) ORDER BY day")
    List<Object[]> countByActionGroupedByDay(@Param("action") String action, @Param("since") Instant since);
}
