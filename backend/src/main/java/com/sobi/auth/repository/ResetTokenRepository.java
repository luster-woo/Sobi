package com.sobi.auth.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Repository;

import java.time.Duration;

@Repository
@RequiredArgsConstructor
public class ResetTokenRepository {

    private static final String KEY_PREFIX = "auth:reset:";
    private static final Duration TOKEN_TTL = Duration.ofMinutes(10);

    private final RedisTemplate<String, String> redisTemplate;

    // token → email. 10분 안에 비밀번호를 변경해야 함
    public void save(String token, String email) {
        redisTemplate.opsForValue().set(KEY_PREFIX + token, email, TOKEN_TTL);
    }

    // 없거나 만료면 null
    public String findEmail(String token) {
        return redisTemplate.opsForValue().get(KEY_PREFIX + token);
    }

    public void delete(String token) {
        redisTemplate.delete(KEY_PREFIX + token);
    }
}