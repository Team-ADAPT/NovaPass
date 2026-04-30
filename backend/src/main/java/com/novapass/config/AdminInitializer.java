package com.novapass.config;

import com.novapass.model.Role;
import com.novapass.model.User;
import com.novapass.repository.UserRepository;
import de.mkammerer.argon2.Argon2;
import de.mkammerer.argon2.Argon2Factory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

import java.security.SecureRandom;

/**
 * Initializes admin user on first startup if ADMIN_EMAIL and ADMIN_PASSWORD are provided.
 * 
 * IMPORTANT: This creates an admin account using a PLAINTEXT password from environment variables.
 * The password is derived using the same PBKDF2 flow as the frontend would use, then hashed with Argon2.
 * 
 * Security note: After first login, admin should change password through proper frontend flow.
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class AdminInitializer {

    private static final Argon2 ARGON2 = Argon2Factory.createAdvanced(Argon2Factory.Argon2Types.ARGON2id);
    private static final int PBKDF2_ITERATIONS = 600_000;
    
    private final UserRepository userRepository;

    @Value("${admin.email:}")
    private String adminEmail;

    @Value("${admin.password:}")
    private String adminPassword;

    @Value("${admin.username:admin}")
    private String adminUsername;

    @Bean
    public CommandLineRunner initializeAdmin() {
        return args -> {
            // Only create admin if both email and password are provided
            if (!StringUtils.hasText(adminEmail) || !StringUtils.hasText(adminPassword)) {
                log.info("Admin credentials not provided in environment - skipping admin initialization");
                return;
            }

            try {
                String email = adminEmail.toLowerCase().trim();
                
                // Check if admin already exists (check again after lowercasing)
                if (userRepository.findByEmail(email).isPresent()) {
                    log.info("Admin user already exists with email: {}", email);
                    return;
                }

                // Generate random salt (32 bytes = 64 hex chars, same as frontend)
                byte[] saltBytes = new byte[32];
                new SecureRandom().nextBytes(saltBytes);
                String salt = bytesToHex(saltBytes);

                // Derive keys using server-side PBKDF2 (mimicking frontend crypto.ts)
                // This is a simplified version - in production, admin should use proper frontend flow
                byte[] keyMaterial = deriveKeyMaterial(adminPassword, saltBytes);
                
                // Split into authKey (first 256 bits) and masterKeyHash (second 256 bits)
                byte[] authKeyBytes = new byte[32]; // 256 bits
                byte[] masterKeyBytes = new byte[32]; // 256 bits
                System.arraycopy(keyMaterial, 0, authKeyBytes, 0, 32);
                System.arraycopy(keyMaterial, 32, masterKeyBytes, 0, 32);
                
                String authKey = bytesToHex(authKeyBytes);
                String masterKeyHash = bytesToHex(masterKeyBytes);

                // Create admin user
                User admin = new User();
                admin.setUsername(adminUsername);
                admin.setEmail(email);
                admin.setRole(Role.ADMIN);
                admin.setSalt(salt);
                admin.setMasterKeyHash(masterKeyHash);
                
                // Hash the authKey with Argon2 (same as registration flow)
                admin.setPasswordHash(ARGON2.hash(3, 65536, 4, authKey.toCharArray()));
                
                userRepository.save(admin);
                
                log.info("✅ Admin user created successfully:");
                log.info("   Email: {}", adminEmail);
                log.info("   Username: {}", adminUsername);
                log.info("   Role: ADMIN");
                log.info("   ⚠️  Please login and change password through the web interface");
                
            } catch (Exception e) {
                log.error("Failed to create admin user", e);
                throw new RuntimeException("Admin initialization failed", e);
            }
        };
    }

    /**
     * Derives key material using PBKDF2-HMAC-SHA256 (matching frontend crypto.ts)
     */
    private byte[] deriveKeyMaterial(String password, byte[] salt) throws Exception {
        javax.crypto.SecretKeyFactory factory = javax.crypto.SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
        javax.crypto.spec.PBEKeySpec spec = new javax.crypto.spec.PBEKeySpec(
            password.toCharArray(),
            salt,
            PBKDF2_ITERATIONS,
            512 // 512 bits total (256 for authKey + 256 for masterKeyHash)
        );
        byte[] keyMaterial = factory.generateSecret(spec).getEncoded();
        spec.clearPassword();
        return keyMaterial;
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
