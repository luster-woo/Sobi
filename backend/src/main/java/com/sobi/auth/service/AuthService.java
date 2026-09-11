package com.sobi.auth.service;

import com.sobi.auth.dto.*;

public interface AuthService {

    EmailCheckResponse checkEmail(String email);

    void sendEmail(String email);

    EmailVerifyResponse verifyEmail(String email, String verificationCode);

    void signup(SignupRequest request);

    LoginResponse login(LoginRequest request);

    RefreshResponse refresh(String refreshToken);

    void logout(Long userId);

    ResetVerifyResponse verifyEmailForReset(String email, String verificationCode);
}
