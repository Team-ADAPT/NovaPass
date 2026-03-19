package com.novapass.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;

/**
 * Token-bucket rate limiter: 20 requests/minute per IP on auth endpoints.
 *
 * Uses a Caffeine cache instead of a raw ConcurrentHashMap so that buckets for
 * inactive IPs are evicted after 10 minutes — preventing unbounded memory growth
 * under heavy/attack traffic.
 */
@Component
public class RateLimitFilter implements Filter {

    private final Cache<String, Bucket> buckets = Caffeine.newBuilder()
        .maximumSize(100_000)
        .expireAfterAccess(Duration.ofMinutes(10))
        .build();

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest  httpReq = (HttpServletRequest)  req;
        HttpServletResponse httpRes = (HttpServletResponse) res;

        if (httpReq.getRequestURI().startsWith("/api/auth/")) {
            Bucket bucket = buckets.get(httpReq.getRemoteAddr(), ip -> newBucket());
            if (!bucket.tryConsume(1)) {
                httpRes.setStatus(429);
                httpRes.setContentType("application/json");
                httpRes.getWriter().write("{\"error\":\"Too many requests\"}");
                return;
            }
        }
        chain.doFilter(req, res);
    }

    private Bucket newBucket() {
        return Bucket.builder()
            .addLimit(Bandwidth.builder()
                .capacity(20)
                .refillGreedy(20, Duration.ofMinutes(1))
                .build())
            .build();
    }
}
