package com.novapass.repository;

import com.novapass.model.Role;
import com.novapass.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
    
    // Admin queries
    Page<User> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<User> findByEmailContainingIgnoreCaseOrUsernameContainingIgnoreCaseOrderByCreatedAtDesc(
            String email, String username, Pageable pageable);
    
    long countByActive(boolean active);
    long countByTwoFactorEnabled(boolean enabled);
    long countByRole(Role role);
    
    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role AND u.active = true")
    long countActiveByRole(@Param("role") Role role);
}
