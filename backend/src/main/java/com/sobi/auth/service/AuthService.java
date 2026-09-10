package com.sobi.auth.service;

import com.sobi.auth.dto.EmailCheckResponse;
import com.sobi.auth.dto.EmailVerifyResponse;

public interface AuthService {

    EmailCheckResponse checkEmail(String email);

    void sendEmail(String email);

    EmailVerifyResponse verifyEmail(String email, String verificationCode);
}
