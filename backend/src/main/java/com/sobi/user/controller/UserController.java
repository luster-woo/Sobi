package com.sobi.user.controller;

import com.sobi.global.response.ApiResponse;
import com.sobi.user.dto.NotificationResponse;
import com.sobi.user.dto.PasswordChangeReqeust;
import com.sobi.user.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PatchMapping("/notification")
    public ResponseEntity<ApiResponse<NotificationResponse>> toggleNotification(
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request) {

        NotificationResponse response = userService.toggleNotification(userId);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "알림 설정 변경 완료",
                        response,
                        request
                ));
    }

    @PatchMapping("/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody PasswordChangeReqeust passwordChangeRequest,
            HttpServletRequest request ) {

        userService.changePassword(userId, passwordChangeRequest);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "비밀번호 변경 완료",
                        request
                ));
    }
}