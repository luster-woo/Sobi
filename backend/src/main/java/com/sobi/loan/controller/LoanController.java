package com.sobi.loan.controller;

import com.sobi.global.response.ApiResponse;
import com.sobi.loan.dto.LoanDetailResponse;
import com.sobi.loan.dto.LoanListResponse;
import com.sobi.loan.dto.LoanSearchCondition;
import com.sobi.loan.service.LoanService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/loan")
@RequiredArgsConstructor
public class LoanController {

    private final LoanService loanService;

    // 대출 상품 목록 (내 사업체 기준 판정 포함)
    @GetMapping
    public ResponseEntity<ApiResponse<LoanListResponse>> list(
            @AuthenticationPrincipal Long userId,
            @ModelAttribute LoanSearchCondition condition,
            HttpServletRequest request
    ) {
        LoanListResponse response = loanService.getLoans(userId, condition);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "대출 상품 목록 조회에 성공하였습니다.",
                        response,
                        request
                ));
    }

    // 대출 상품 상세 (불가 사유 포함)
    @GetMapping("/{loanId}")
    public ResponseEntity<ApiResponse<LoanDetailResponse>> detail(
            @PathVariable Long loanId,
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request
    ) {
        LoanDetailResponse response = loanService.getLoan(userId, loanId);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "대출 상품 상세 조회에 성공하였습니다.",
                        response,
                        request
                ));
    }
}
