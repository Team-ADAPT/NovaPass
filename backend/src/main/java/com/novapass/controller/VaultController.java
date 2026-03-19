package com.novapass.controller;

import com.novapass.dto.VaultDTOs.*;
import com.novapass.service.VaultService;
import com.novapass.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vault")
@RequiredArgsConstructor
public class VaultController {

    private final VaultService vaultService;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ResponseEntity<List<ItemResponse>> getAll(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(vaultService.getAll(securityUtils.getUserId(ud)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ItemResponse> getOne(@AuthenticationPrincipal UserDetails ud,
                                               @PathVariable Long id) {
        return ResponseEntity.ok(vaultService.getOne(securityUtils.getUserId(ud), id));
    }

    @PostMapping
    public ResponseEntity<ItemResponse> create(@AuthenticationPrincipal UserDetails ud,
                                               @Valid @RequestBody CreateItemRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(vaultService.create(securityUtils.getUserId(ud), req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ItemResponse> update(@AuthenticationPrincipal UserDetails ud,
                                               @PathVariable Long id,
                                               @Valid @RequestBody UpdateItemRequest req) {
        return ResponseEntity.ok(vaultService.update(securityUtils.getUserId(ud), id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UserDetails ud,
                                       @PathVariable Long id) {
        vaultService.delete(securityUtils.getUserId(ud), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/sync")
    public ResponseEntity<SyncResponse> sync(@AuthenticationPrincipal UserDetails ud,
                                             @RequestBody SyncRequest req) {
        return ResponseEntity.ok(vaultService.sync(securityUtils.getUserId(ud), req));
    }
}
