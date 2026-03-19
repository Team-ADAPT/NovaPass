package com.novapass.service;

import com.novapass.dto.VaultDTOs.*;
import com.novapass.exception.ConflictException;
import com.novapass.exception.ResourceNotFoundException;
import com.novapass.model.User;
import com.novapass.model.VaultItem;
import com.novapass.repository.UserRepository;
import com.novapass.repository.VaultItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VaultService {

    private final VaultItemRepository vaultItemRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public List<ItemResponse> getAll(Long userId) {
        return vaultItemRepository.findByUserId(userId).stream()
            .map(this::toResponse).toList();
    }

    public ItemResponse getOne(Long userId, Long itemId) {
        return toResponse(findOwned(userId, itemId));
    }

    @Transactional
    public ItemResponse create(Long userId, CreateItemRequest req) {
        User user = userRepository.getReferenceById(userId);
        VaultItem item = new VaultItem();
        item.setUser(user);
        item.setItemType(req.getItemType());
        item.setTitle(req.getTitle());
        item.setEncryptedData(req.getEncryptedData());
        item.setUrl(req.getUrl());
        item.setFavorite(req.isFavorite());
        item.setVersion(1L);
        VaultItem saved = vaultItemRepository.save(item);
        auditService.log(user, "VAULT_CREATE", "vault_item", saved.getId(), null, null);
        return toResponse(saved);
    }

    @Transactional
    public ItemResponse update(Long userId, Long itemId, UpdateItemRequest req) {
        VaultItem item = findOwned(userId, itemId);

        // Optimistic concurrency: reject stale writes
        if (!item.getVersion().equals(req.getVersion()))
            throw new ConflictException("Version conflict — fetch latest and retry");

        if (req.getTitle() != null) item.setTitle(req.getTitle());
        item.setEncryptedData(req.getEncryptedData());
        item.setUrl(req.getUrl());
        item.setFavorite(req.isFavorite());
        item.setVersion(item.getVersion() + 1);

        return toResponse(vaultItemRepository.save(item));
    }

    @Transactional
    public void delete(Long userId, Long itemId) {
        findOwned(userId, itemId); // ownership check
        vaultItemRepository.deleteByIdAndUserId(itemId, userId);
        auditService.log(userRepository.getReferenceById(userId), "VAULT_DELETE", "vault_item", itemId, null, null);
    }

    public SyncResponse sync(Long userId, SyncRequest req) {
        Instant since = req.getLastSyncAt() != null ? req.getLastSyncAt() : Instant.EPOCH;
        List<ItemResponse> updated = vaultItemRepository
            .findByUserIdAndUpdatedAtAfter(userId, since).stream()
            .map(this::toResponse).toList();

        return buildSyncResponse(updated);
    }

    // --- Private helpers ---

    private VaultItem findOwned(Long userId, Long itemId) {
        return vaultItemRepository.findByIdAndUserId(itemId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Vault item not found"));
    }

    private ItemResponse toResponse(VaultItem item) {
        ItemResponse r = new ItemResponse();
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

    private SyncResponse buildSyncResponse(List<ItemResponse> updated) {
        SyncResponse resp = new SyncResponse();
        resp.setUpdated(updated);
        resp.setDeletedIds(List.of()); // extend with soft-delete tombstones if needed
        resp.setSyncedAt(Instant.now());
        return resp;
    }
}
