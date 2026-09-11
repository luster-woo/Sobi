package com.sobi.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class OAuthLoginRequest {

    @NotBlank
    private String code;

    @NotBlank
    private String redirectUri;
}