package com.sobi.application.controller;

import com.sobi.application.dto.ApplicationCreateResponse;
import com.sobi.application.dto.ApplicationDetailResponse;
import com.sobi.application.dto.ApplicationListResponse;
import com.sobi.application.dto.ApplicationSubmitRequest;
import com.sobi.application.dto.ApplicationSubmitResponse;
import com.sobi.application.service.ApplicationService;
import com.sobi.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/application")
@RequiredArgsConstructor
public class ApplicationController {

    private final ApplicationService applicationService;

    // 신청 생성. 작성 중 신청이 있으면 그 신청 id 를 반환
    @PostMapping
    public ResponseEntity<ApiResponse<ApplicationCreateResponse>> create(
            @AuthenticationPrincipal Long userId,
            @RequestParam String type,
            @RequestParam Long programId,
            HttpServletRequest request
    ) {
        ApplicationCreateResponse response = applicationService.create(userId, type, programId);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "신청 생성에 성공하였습니다.",
                        response,
                        request
                ));
    }

    // 신청 상세 (서류 제출 페이지의 서류 목록)
    @GetMapping("/{applicationId}")
    public ResponseEntity<ApiResponse<ApplicationDetailResponse>> detail(
            @PathVariable Long applicationId,
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request
    ) {
        ApplicationDetailResponse response = applicationService.getDetail(userId, applicationId);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "신청 상세 조회에 성공하였습니다.",
                        response,
                        request
                ));
    }

    // 신청 현황 목록 (진행 중 / 완료 / 전체)
    @GetMapping
    public ResponseEntity<ApiResponse<ApplicationListResponse>> list(
            @AuthenticationPrincipal Long userId,
            @RequestParam(required = false) String status,
            HttpServletRequest request
    ) {
        ApplicationListResponse response = applicationService.getApplications(userId, status);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "신청 목록 조회에 성공하였습니다.",
                        response,
                        request
                ));
    }

    // 신청 취소 (작성 중인 신청만)
    @DeleteMapping("/{applicationId}")
    public ResponseEntity<ApiResponse<Void>> cancel(
            @PathVariable Long applicationId,
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request
    ) {
        applicationService.cancel(userId, applicationId);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "신청 취소에 성공하였습니다.",
                        request
                ));
    }

    // 신청 제출 ([신청하기]). 대출은 금융망 심사·가입까지 한 번에 진행된다
    @PostMapping("/{applicationId}/submit")
    public ResponseEntity<ApiResponse<ApplicationSubmitResponse>> submit(
            @PathVariable Long applicationId,
            @AuthenticationPrincipal Long userId,
            @RequestBody ApplicationSubmitRequest submitRequest,
            HttpServletRequest request
    ) {
        ApplicationSubmitResponse response = applicationService.submit(userId, applicationId, submitRequest);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "신청 제출에 성공하였습니다.",
                        response,
                        request
                ));
    }
}
