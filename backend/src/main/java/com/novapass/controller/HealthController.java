package com.novapass.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    public HealthController(org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        String dbStatus = "UP";
        try {
            jdbcTemplate.execute("SELECT 1");
        } catch (Exception e) {
            dbStatus = "DOWN: " + e.getMessage();
        }
        
        return ResponseEntity.ok(Map.of(
            "status", dbStatus.startsWith("UP") ? "UP" : "DOWN",
            "database", dbStatus,
            "timestamp", Instant.now()
        ));
    }
}
