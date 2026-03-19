package com.novapass.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "passkeys", indexes = {
    @Index(name = "idx_passkey_user_id", columnList = "user_id"),
    @Index(name = "idx_passkey_credential_id", columnList = "credential_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Passkey {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "credential_id", nullable = false, unique = true)
    private String credentialId;

    @Column(name = "public_key_cose", nullable = false, columnDefinition = "TEXT")
    private String publicKeyCose;

    @Column(name = "sign_count", nullable = false)
    private Long signCount;

    @Column(name = "name", length = 255)
    private String name;

    @Column(name = "transports")
    private String transports;

    @Column(name = "aaguid")
    private String aaguid;

    @Column(name = "user_handle", nullable = false)
    private String userHandle;

    @Column(name = "attestation_format")
    private String attestationFormat;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "last_used_at")
    private Instant lastUsedAt;
}
