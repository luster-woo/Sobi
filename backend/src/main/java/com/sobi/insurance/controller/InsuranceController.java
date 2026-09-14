package com.sobi.insurance.controller;

import com.sobi.global.response.ApiResponse;
import com.sobi.insurance.dto.InsuranceDetailResponse;
import com.sobi.insurance.dto.InsuranceListResponse;
import com.sobi.insurance.dto.InsuranceStatusRequest;
import com.sobi.insurance.service.InsuranceService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/insurance")
@RequiredArgsConstructor
public class InsuranceController {

    private final InsuranceService insuranceService;

    // 의무 보험 리스트 불러오기
    @GetMapping
    public ResponseEntity<ApiResponse<InsuranceListResponse>> list(
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request
    ) {
        InsuranceListResponse response = insuranceService.getChecklist(userId);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "의무보험 목록 조회에 성공하였습니다.",
                        response,
                        request
                ));
    }

    // 의무 보험 세부 내용 불러오기
    @GetMapping("/{insuranceChecklistId}")
    public ResponseEntity<ApiResponse<InsuranceDetailResponse>> detail(
            @PathVariable Long insuranceChecklistId,
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request
    ) {
        InsuranceDetailResponse response =
                insuranceService.getDetail(userId, insuranceChecklistId);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "의무보험 상세 조회에 성공하였습니다.",
                        response,
                        request
                ));
    }

    // 의무보험 상태 변경
    @PatchMapping("/{insuranceChecklistId}/status")
    public ResponseEntity<ApiResponse<Void>> changeStatus(
            @PathVariable Long insuranceChecklistId,
            @Valid @RequestBody InsuranceStatusRequest statusRequest,
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request
    ) {
        insuranceService.changeStatus(userId, insuranceChecklistId, statusRequest.getStatus());

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "의무보험 상태 변경에 성공하였습니다.",
                        request
                ));
    }
}
