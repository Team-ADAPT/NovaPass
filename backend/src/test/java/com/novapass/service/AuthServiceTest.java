package com.novapass.service;

import com.novapass.dto.AuthDTOs.LoginRequest;
import com.novapass.dto.AuthDTOs.TokenResponse;
import com.novapass.model.RefreshToken;
import com.novapass.model.Role;
import com.novapass.model.User;
import com.novapass.repository.RefreshTokenRepository;
import com.novapass.repository.UserRepository;
import com.novapass.security.JwtTokenProvider;
import de.mkammerer.argon2.Argon2;
import de.mkammerer.argon2.Argon2Factory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    private static final Argon2 ARGON2 =
        Argon2Factory.createAdvanced(Argon2Factory.Argon2Types.ARGON2id);

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private TotpService totpService;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private AuthService authService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "refreshExpirationMs", 604800000L);
    }

    @Test
    void loginDefaultsMissingRoleBeforeIssuingTokens() {
        String email = "user@example.com";
        String authKey = "derived-auth-key";

        User user = new User();
        user.setId(42L);
        user.setEmail(email);
        user.setPasswordHash(ARGON2.hash(3, 65536, 4, authKey.toCharArray()));
        user.setActive(true);
        user.setRole(null);

        LoginRequest request = new LoginRequest();
        request.setEmail(email);
        request.setAuthKey(authKey);

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtTokenProvider.generateTokenForUser(42L, email, Role.USER)).thenReturn("access-token");
        when(jwtTokenProvider.getExpirationMs()).thenReturn(900000L);

        TokenResponse response = authService.login(request, "127.0.0.1", "JUnit");

        assertThat(response.getAccessToken()).isEqualTo("access-token");
        assertThat(user.getRole()).isEqualTo(Role.USER);
        verify(jwtTokenProvider).generateTokenForUser(42L, email, Role.USER);

        ArgumentCaptor<User> savedUser = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(savedUser.capture());
        assertThat(savedUser.getValue().getRole()).isEqualTo(Role.USER);
    }
}
