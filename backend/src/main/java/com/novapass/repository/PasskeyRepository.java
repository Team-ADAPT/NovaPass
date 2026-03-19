package com.novapass.repository;

import com.novapass.model.Passkey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PasskeyRepository extends JpaRepository<Passkey, Long> {

    List<Passkey> findByUserId(Long userId);

    Optional<Passkey> findByCredentialId(String credentialId);

    @Query("SELECT p FROM Passkey p WHERE p.user.email = :email")
    List<Passkey> findByUserEmail(@Param("email") String email);

    boolean existsByCredentialId(String credentialId);

    void deleteByIdAndUserId(Long id, Long userId);

    int countByUserId(Long userId);
}
