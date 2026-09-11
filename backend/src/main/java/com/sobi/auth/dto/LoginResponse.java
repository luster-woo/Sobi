package com.sobi.auth.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.sobi.user.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {

    private String accessToken;
    private String tokenType;
    private Long expiresIn;      // 초
    private UserInfo user;

    @JsonIgnore                  // 쿠키로만 내려감. body 직렬화 제외
    private String refreshToken;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Boolean isNewUser;   // 소셜 최초 가입 시에만 true

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInfo {
        private Long userId;
        private String email;
        private String name;
        private String role;

        public static UserInfo from(User user) {
            return UserInfo.builder()
                    .userId(user.getId())
                    .email(user.getEmail())
                    .name(user.getName())
                    .role(user.getRole() != null ? user.getRole().name() : null)
                    .build();
        }
    }
}