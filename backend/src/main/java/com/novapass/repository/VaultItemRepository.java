package com.novapass.repository;

import com.novapass.model.VaultItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface VaultItemRepository extends JpaRepository<VaultItem, Long> {
    List<VaultItem> findByUserId(Long userId);
    List<VaultItem> findByUserIdAndItemType(Long userId, String itemType);
    List<VaultItem> findByUserIdAndUpdatedAtAfter(Long userId, Instant since);
    Optional<VaultItem> findByIdAndUserId(Long id, Long userId);

    // Returns number of rows deleted — lets the service detect 404 without a prior SELECT
    @Modifying
    @Query("DELETE FROM VaultItem v WHERE v.id = :id AND v.user.id = :userId")
    int deleteByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    // Admin queries
    long countByUserId(Long userId);
}
