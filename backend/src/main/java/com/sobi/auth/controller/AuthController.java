package com.sobi.auth.controller;

import com.sobi.auth.dto.*;
import com.sobi.auth.jwt.JwtProperties;
import com.sobi.auth.service.AuthService;
import com.sobi.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RestController
@RequestMapping("/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtProperties jwtProperties;

    @GetMapping("/email/check")
    public ResponseEntity<ApiResponse<EmailCheckResponse>> checkEmail(
            @RequestParam @NotBlank @Email String email,
            HttpServletRequest request ) {

        EmailCheckResponse response = authService.checkEmail(email);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "이메일 중복 확인 성공",
                        response,
                        request
                ));
    }

    @PostMapping("/email/send")
    public ResponseEntity<ApiResponse<Void>> sendEmail(
            @Valid @RequestBody EmailSendRequest emailSendRequest,
            HttpServletRequest request ) {

        authService.sendEmail(emailSendRequest.getEmail());

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "인증번호 발송 성공",
                        request
                ));
    }

    @PostMapping("/email/verify")
    public ResponseEntity<ApiResponse<EmailVerifyResponse>> verifyEmail(
            @Valid @RequestBody EmailVerifyRequest emailVerifyRequest,
            HttpServletRequest request ) {

        EmailVerifyResponse response =  authService.verifyEmail(
                                        emailVerifyRequest.getEmail(),
                                        emailVerifyRequest.getVerificationCode());

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "이메일 인증 성공",
                        response,
                        request
                ));
    }

    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<Void>> signup(
            @Valid @RequestBody SignupRequest signupRequest,
            HttpServletRequest request ) {

        authService.signup(signupRequest);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "회원가입 성공",
                        request
                ));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest loginRequest,
            HttpServletRequest request) {

        LoginResponse response = authService.login(loginRequest);

        return ResponseEntity
                .status(HttpStatus.OK)
                .header(HttpHeaders.SET_COOKIE, createRefreshCookie(response.getRefreshToken()).toString())
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "로그인 성공",
                        response,
                        request
                ));
    }

    @PostMapping("/oauth/{provider}")
    public ResponseEntity<ApiResponse<LoginResponse>> oauthLogin(
            @PathVariable String provider,
            @Valid @RequestBody OAuthLoginRequest oAuthLoginRequest,
            HttpServletRequest request) {

        LoginResponse response = authService.oauthLogin(provider, oAuthLoginRequest);

        return ResponseEntity
                .status(HttpStatus.OK)
                .header(HttpHeaders.SET_COOKIE, createRefreshCookie(response.getRefreshToken()).toString())
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "소셜 로그인 성공",
                        response,
                        request
                ));
    }

    // login / oauth 공통
    private ResponseCookie createRefreshCookie(String refreshToken) {
        return ResponseCookie.from("refreshToken", refreshToken)
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path("/api/v1/auth")
                .maxAge(Duration.ofMillis(jwtProperties.getRefreshExp()))
                .build();
    }

    @PostMapping("/social/{provider}")
    public ResponseEntity<ApiResponse<SocialLinkResponse>> linkSocial(
            @AuthenticationPrincipal Long userId,
            @PathVariable String provider,
            @Valid @RequestBody OAuthLoginRequest oAuthLoginRequest,
            HttpServletRequest request) {

        SocialLinkResponse response = authService.linkSocial(userId, provider, oAuthLoginRequest);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "소셜 계정 연결이 완료되었습니다.",
                        response,
                        request
                ));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<RefreshResponse>> refresh(
            @CookieValue(value = "refreshToken", required = false) String refreshToken,
            HttpServletRequest request ) {

        RefreshResponse response = authService.refresh(refreshToken);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "액세스 토큰 재발급 성공",
                        response,
                        request
                ));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request ) {

        authService.logout(userId);

        // 로그인 때와 동일한 속성이어야 브라우저가 같은 쿠키로 인식해 삭제됨
        ResponseCookie deleteCookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path("/api/v1/auth")
                .maxAge(0)
                .build();

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "로그아웃 성공",
                        request
                ));
    }

    @PostMapping("/email/verify/reset")
    public ResponseEntity<ApiResponse<ResetVerifyResponse>> verifyEmailForReset(
            @Valid @RequestBody EmailVerifyRequest emailVerifyRequest,
            HttpServletRequest request) {

        ResetVerifyResponse response = authService.verifyEmailForReset(
                emailVerifyRequest.getEmail(),
                emailVerifyRequest.getVerificationCode()
        );

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "이메일 인증번호 검증 성공",
                        response,
                        request
                ));
    }

    @PostMapping("/password/reset")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody PasswordResetRequest passwordResetRequest,
            HttpServletRequest request) {

        authService.resetPassword(passwordResetRequest);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "비밀번호 변경이 완료되었습니다.",
                        request
                ));
    }


}