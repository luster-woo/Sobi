package com.sobi.support.controller;

import com.sobi.global.response.ApiResponse;
import com.sobi.support.dto.SupportProgramListResponse;
import com.sobi.support.dto.SupportSearchCondition;
import com.sobi.support.service.SupportService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/support")
@RequiredArgsConstructor
public class SupportController {

    private final SupportService supportService;

    /**
     * 지원사업 목록. 내 사업체 기준 판정이 뱃지로 함께 나간다.
     * 마감된 공고는 제외하며, 정렬은 판정 순이 항상 1차다.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<SupportProgramListResponse>> list(
            @AuthenticationPrincipal Long userId,
            @ModelAttribute SupportSearchCondition condition,
            HttpServletRequest request
    ) {

        SupportProgramListResponse response = supportService.getPrograms(userId, condition);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "지원사업 목록 조회 성공",
                        response,
                        request
                ));
    }
}