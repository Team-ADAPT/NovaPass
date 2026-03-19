package com.novapass.service;

import com.novapass.model.AuditLog;
import com.novapass.model.User;
import com.novapass.repository.AuditLogRepository;
import com.novapass.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    @Async
    public void log(User user, String action, String resourceType, Long resourceId,
                    String ipAddress, String userAgent) {
        AuditLog log = new AuditLog();
        log.setUser(user);
        log.setAction(action);
        log.setResourceType(resourceType);
        log.setResourceId(resourceId);
        log.setIpAddress(ipAddress);
        log.setUserAgent(userAgent);
        auditLogRepository.save(log);
    }

    /**
     * Overload that accepts a userId — uses getReferenceById (no SELECT, just a proxy)
     * instead of findById, avoiding an extra DB round-trip.
     */
    @Async
    public void log(Long userId, String action, String resourceType, Long resourceId,
                    String ipAddress, String userAgent) {
        User userRef = userId != null ? userRepository.getReferenceById(userId) : null;
        log(userRef, action, resourceType, resourceId, ipAddress, userAgent);
    }
}
