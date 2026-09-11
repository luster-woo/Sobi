package com.sobi.auth.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Repository;

import java.time.Duration;

@Repository
@RequiredArgsConstructor
public class RefreshTokenRepository {

    private static final String KEY_PREFIX = "auth:refresh:";

    private final RedisTemplate<String, String> redisTemplate;

    // 유저당 1개. 재로그인 시 덮어써서 이전 기기 세션 무효화
    public void save(Long userId, String refreshToken, Duration ttl) {
        redisTemplate.opsForValue().set(KEY_PREFIX + userId, refreshToken, ttl);
    }

    public String find(Long userId) {
        return redisTemplate.opsForValue().get(KEY_PREFIX + userId);
    }

    public void delete(Long userId) {
        redisTemplate.delete(KEY_PREFIX + userId);
    }
}