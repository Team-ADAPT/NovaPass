package com.novapass.util;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

@Component
public class SecurityUtils {

    /**
     * Extracts the user ID from the UserDetails principal.
     * UserDetailsServiceImpl stores the principal as "id:email".
     */
    public Long getUserId(UserDetails userDetails) {
        String username = userDetails.getUsername();
        int colon = username.indexOf(':');
        if (colon < 0) throw new IllegalStateException("Unexpected principal format: " + username);
        return Long.parseLong(username.substring(0, colon));
    }

    /**
     * Extracts the email from the UserDetails principal.
     */
    public String getEmail(UserDetails userDetails) {
        String username = userDetails.getUsername();
        int colon = username.indexOf(':');
        if (colon < 0) return username;
        return username.substring(colon + 1);
    }
}
