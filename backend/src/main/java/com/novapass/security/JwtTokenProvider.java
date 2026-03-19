package com.novapass.security;

import com.novapass.model.Role;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtTokenProvider {

    @Value("${spring.security.jwt.secret}")
    private String jwtSecret;

    @Value("${spring.security.jwt.expiration}")
    private long jwtExpirationMs;

    // Built once at first use — avoids re-deriving the key on every request
    private volatile SecretKey cachedKey;

    private SecretKey key() {
        if (cachedKey == null) {
            synchronized (this) {
                if (cachedKey == null)
                    cachedKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
            }
        }
        return cachedKey;
    }

    public String generateTokenForUser(Long userId, String email, Role role) {
        Date now = new Date();
        Role effectiveRole = role != null ? role : Role.USER;
        return Jwts.builder()
            .subject(email)
            .claim("userId", userId)
            .claim("role", effectiveRole.name())
            .issuedAt(now)
            .expiration(new Date(now.getTime() + jwtExpirationMs))
            .signWith(key())
            .compact();
    }

    // Kept for PasskeyService which issues tokens without a Role object
    public String generateTokenForUser(String email) {
        Date now = new Date();
        return Jwts.builder()
            .subject(email)
            .issuedAt(now)
            .expiration(new Date(now.getTime() + jwtExpirationMs))
            .signWith(key())
            .compact();
    }

    public String getUsernameFromToken(String token) {
        return Jwts.parser().verifyWith(key()).build()
            .parseSignedClaims(token).getPayload().getSubject();
    }

    public Long getUserIdFromToken(String token) {
        Claims claims = Jwts.parser().verifyWith(key()).build()
            .parseSignedClaims(token).getPayload();
        return claims.get("userId", Long.class);
    }

    public String getRoleFromToken(String token) {
        Claims claims = Jwts.parser().verifyWith(key()).build()
            .parseSignedClaims(token).getPayload();
        return claims.get("role", String.class);
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(key()).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public long getExpirationMs() {
        return jwtExpirationMs;
    }
}
