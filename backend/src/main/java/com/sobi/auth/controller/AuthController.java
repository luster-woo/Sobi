package com.sobi.auth.controller;

import com.sobi.auth.dto.EmailCheckResponse;
import com.sobi.auth.dto.EmailSendRequest;
import com.sobi.auth.service.AuthService;
import com.sobi.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

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
}