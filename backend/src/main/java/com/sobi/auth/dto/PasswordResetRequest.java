package com.sobi.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class PasswordResetRequest {

    @NotBlank
    private String resetToken;

    @NotBlank
    @Size(min = 8, max = 20)
    private String newPassword;
}