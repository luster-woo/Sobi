package com.sobi.auth.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Repository;

import java.time.Duration;

@Repository
@RequiredArgsConstructor
public class EmailCodeRepository {

    private static final String KEY_PREFIX = "auth:email:code:";
    private static final Duration CODE_TTL = Duration.ofMinutes(5);

    private final RedisTemplate<String, String> redisTemplate;

    public void save(String email, String code) {
        redisTemplate.opsForValue().set(KEY_PREFIX + email, code, CODE_TTL);
    }

    // 있다면 코드 반환, 없거나 만료된거라면 null
    public String find(String email) {
        return redisTemplate.opsForValue().get(KEY_PREFIX + email);
    }

    public void delete(String email) {
        redisTemplate.delete(KEY_PREFIX + email);
    }
}
