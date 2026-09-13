package com.sobi.funding.controller;


import com.sobi.business.repository.BusinessReporitory;
import com.sobi.funding.dto.FundingRecommendRequest;
import com.sobi.funding.dto.FundingRecommendResponse;
import com.sobi.funding.service.FundingService;
import com.sobi.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/funding")
@RequiredArgsConstructor
public class FundingController {

    private final FundingService fundingService;


    @PostMapping("/recommend")
    public ResponseEntity<ApiResponse<FundingRecommendResponse>> recommend(
            @AuthenticationPrincipal Long userId,
            @RequestBody FundingRecommendRequest fundingRecommendRequest,
            HttpServletRequest request

    ) {

        // 추천 결과 가져오고
        FundingRecommendResponse response = fundingService.recommend(userId, fundingRecommendRequest);


        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "자금 조합 추천 조회에 성공했습니다",
                        response,
                        request
                ));

    }



}
