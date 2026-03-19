package com.novapass.service;

import com.novapass.model.User;
import com.novapass.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String emailOrPrincipal) throws UsernameNotFoundException {
        // Support both plain email and "id:email" format (used internally)
        String email = emailOrPrincipal.contains(":") 
            ? emailOrPrincipal.substring(emailOrPrincipal.indexOf(':') + 1)
            : emailOrPrincipal;

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        // Include user ID in the username field for easy extraction (id:email format)
        String usernameWithId = user.getId() + ":" + user.getEmail();
        
        // Grant authorities based on role
        List<SimpleGrantedAuthority> authorities = List.of(
            new SimpleGrantedAuthority("ROLE_" + user.getRole().name())
        );

        return new org.springframework.security.core.userdetails.User(
            usernameWithId,
            user.getPasswordHash(),
            user.isActive(),
            true, true, true,
            authorities
        );
    }

    /**
     * Load user by ID (for JWT token validation)
     */
    public UserDetails loadUserById(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UsernameNotFoundException("User not found with ID: " + userId));

        String usernameWithId = user.getId() + ":" + user.getEmail();
        
        List<SimpleGrantedAuthority> authorities = List.of(
            new SimpleGrantedAuthority("ROLE_" + user.getRole().name())
        );

        return new org.springframework.security.core.userdetails.User(
            usernameWithId,
            user.getPasswordHash(),
            user.isActive(),
            true, true, true,
            authorities
        );
    }
}
