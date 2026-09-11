package com.sobi.auth.service;

import com.sobi.auth.dto.EmailCheckResponse;
import com.sobi.auth.dto.EmailVerifyResponse;
import com.sobi.auth.dto.SignupRequest;

public interface AuthService {

    EmailCheckResponse checkEmail(String email);

    void sendEmail(String email);

    EmailVerifyResponse verifyEmail(String email, String verificationCode);

    void signup(SignupRequest request);
}
