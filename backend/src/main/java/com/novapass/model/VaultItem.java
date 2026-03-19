package com.novapass.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "vault_items", indexes = {
    @Index(name = "idx_vault_user_id", columnList = "user_id"),
    @Index(name = "idx_vault_item_type", columnList = "item_type")
})
@Data
@NoArgsConstructor
public class VaultItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 'login', 'card', 'note', 'identity'
    @Column(name = "item_type", nullable = false, length = 50)
    private String itemType;

    @Column(nullable = false)
    private String title;

    // AES-256-GCM encrypted JSON blob — server never sees plaintext
    @Column(name = "encrypted_data", nullable = false, columnDefinition = "TEXT")
    private String encryptedData;

    // Monotonically increasing version for conflict resolution
    @Column(nullable = false)
    private Long version = 1L;

    @Column(length = 500)
    private String url;

    private boolean favorite = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
