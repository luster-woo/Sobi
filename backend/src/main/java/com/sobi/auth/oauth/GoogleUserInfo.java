package com.sobi.auth.oauth;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class GoogleUserInfo {

    private String providerId;   // 구글 고유 ID (id_token의 sub)
    private String email;
    private String name;
}