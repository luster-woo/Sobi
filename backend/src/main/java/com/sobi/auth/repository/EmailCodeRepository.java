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

    private static final String COOLDOWN_PREFIX = "auth:email:cooldown:";
    private static final Duration COOLDOWN_TTL = Duration.ofMinutes(1);

    private static final String VERIFIED_PREFIX = "auth:email:verified:";
    private static final Duration VERIFIED_TTL = Duration.ofMinutes(30);

    private final RedisTemplate<String, String> redisTemplate;

    public void save(String email, String code) {
        redisTemplate.opsForValue().set(KEY_PREFIX + email, code, CODE_TTL);
    }

    public boolean isCoolingDown(String email){
        return redisTemplate.hasKey(COOLDOWN_PREFIX + email);
    }

    public void startCoolDown(String email){
        redisTemplate.opsForValue().set(COOLDOWN_PREFIX + email,"1", COOLDOWN_TTL);
    }

    public void saveVerifed(String email, String code) {
        redisTemplate.opsForValue().set(VERIFIED_PREFIX + email, "1", VERIFIED_TTL);
    }

    public boolean isVerified(String email){
        return redisTemplate.hasKey(VERIFIED_PREFIX + email);
    }

    public void deleteVerified(String email){
        redisTemplate.delete(VERIFIED_PREFIX + email);
    }

    // 있다면 코드 반환, 없거나 만료된거라면 null
    public String find(String email) {
        return redisTemplate.opsForValue().get(KEY_PREFIX + email);
    }

    public void delete(String email) {
        redisTemplate.delete(KEY_PREFIX + email);
    }
}
