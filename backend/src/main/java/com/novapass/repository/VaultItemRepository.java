package com.novapass.repository;

import com.novapass.model.VaultItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface VaultItemRepository extends JpaRepository<VaultItem, Long> {
    List<VaultItem> findByUserId(Long userId);
    List<VaultItem> findByUserIdAndItemType(Long userId, String itemType);
    List<VaultItem> findByUserIdAndUpdatedAtAfter(Long userId, Instant since);
    Optional<VaultItem> findByIdAndUserId(Long id, Long userId);
    void deleteByIdAndUserId(Long id, Long userId);
    
    // Admin queries
    long countByUserId(Long userId);
}
