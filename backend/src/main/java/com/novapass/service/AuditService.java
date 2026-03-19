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

    @Async
    public void log(Long userId, String action, String resourceType, Long resourceId,
                    String ipAddress, String userAgent) {
        User user = userId != null ? userRepository.findById(userId).orElse(null) : null;
        log(user, action, resourceType, resourceId, ipAddress, userAgent);
    }
}
