package com.novapass.service;

import com.novapass.dto.SyncDTOs;
import com.novapass.model.DeviceSession;
import com.novapass.model.User;
import com.novapass.repository.DeviceSessionRepository;
import com.novapass.repository.SyncLogRepository;
import com.novapass.repository.UserRepository;
import com.novapass.repository.VaultItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SyncServiceTest {

    @Mock
    private DeviceSessionRepository deviceSessionRepository;
    @Mock
    private SyncLogRepository syncLogRepository;
    @Mock
    private VaultItemRepository vaultItemRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AuditService auditService;

    @InjectMocks
    private SyncService syncService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("test@example.com");
    }

    @Test
    void registerDevice_NewDevice_ShouldSave() {
        // Arrange
        Long userId = 1L;
        SyncDTOs.RegisterDeviceRequest req = new SyncDTOs.RegisterDeviceRequest();
        req.setDeviceId("device-123");
        req.setDeviceName("Test Phone");
        req.setDeviceType("mobile");

        when(userRepository.getReferenceById(userId)).thenReturn(testUser);
        when(deviceSessionRepository.findByUserIdAndDeviceId(userId, "device-123"))
            .thenReturn(Optional.empty());

        // Act
        syncService.registerDevice(userId, req);

        // Assert
        verify(deviceSessionRepository, times(1)).save(any(DeviceSession.class));
        verify(auditService, times(1)).log(eq(userId), eq("DEVICE_REGISTERED"), anyString(), any(), anyString(), anyString());
    }

    @Test
    void unregisterDevice_ExistingDevice_ShouldDelete() {
        // Arrange
        Long userId = 1L;
        String deviceId = "device-123";
        when(deviceSessionRepository.deleteByUserIdAndDeviceId(userId, deviceId)).thenReturn(1);

        // Act
        syncService.unregisterDevice(userId, deviceId);

        // Assert
        verify(deviceSessionRepository, times(1)).deleteByUserIdAndDeviceId(userId, deviceId);
        verify(auditService, times(1)).log(eq(userId), eq("DEVICE_UNREGISTERED"), anyString(), any(), eq(deviceId), anyString());
    }
}
