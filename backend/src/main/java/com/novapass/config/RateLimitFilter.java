package com.novapass.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Token-bucket rate limiter: 20 requests/minute per IP on auth endpoints.
 * For production, replace the in-memory map with a Redis-backed Bucket4j store.
 */
@Component
public class RateLimitFilter implements Filter {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpReq = (HttpServletRequest) req;
        HttpServletResponse httpRes = (HttpServletResponse) res;

        if (httpReq.getRequestURI().startsWith("/api/auth/")) {
            Bucket bucket = buckets.computeIfAbsent(httpReq.getRemoteAddr(), this::newBucket);
            if (!bucket.tryConsume(1)) {
                httpRes.setStatus(429);
                httpRes.getWriter().write("{\"error\":\"Too many requests\"}");
                return;
            }
        }
        chain.doFilter(req, res);
    }

    private Bucket newBucket(String ip) {
        return Bucket.builder()
            .addLimit(Bandwidth.builder()
                .capacity(20)
                .refillGreedy(20, Duration.ofMinutes(1))
                .build())
            .build();
    }
}
