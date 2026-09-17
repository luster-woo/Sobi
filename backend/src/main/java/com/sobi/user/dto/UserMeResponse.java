package com.sobi.user.dto;

import com.sobi.user.entity.Provider;
import com.sobi.user.entity.Role;
import com.sobi.user.entity.User;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

/**
 * 로그인한 본인 정보. 새로고침 후 세션 복구에서 재발급 직후 호출한다.
 *
 * 호출이 잦으므로 가볍게 유지한다. 사업자 정보·계좌 요약처럼 여러 도메인을
 * 모아야 하는 값은 마이페이지 전용 API 가 맡는다.
 */
@Getter
@Builder
public class UserMeResponse {

    private final Long userId;
    private final String email;
    private final String name;
    private final LocalDate birthDate;

    /** ENTREPRENEUR / PREENTREPRENEUR. 아직 정해지지 않았으면 null */
    private final Role role;

    /**
     * LOCAL / GOOGLE.
     * 화면이 비밀번호 변경과 소셜 전환 중 무엇을 보여줄지 가르는 데 쓴다.
     * 새로고침하면 복구할 방법이 없어 여기 싣는다.
     */
    private final Provider provider;

    public static UserMeResponse from(User user) {
        return UserMeResponse.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .birthDate(user.getBirthDate())
                .role(user.getRole())
                .provider(user.getProvider())
                .build();
    }
}