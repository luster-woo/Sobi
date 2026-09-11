package com.sobi.common.controller;

import com.sobi.common.dto.MarketAnalysisResponse;
import com.sobi.common.dto.MarketBusinessResponse;
import com.sobi.common.dto.MarketRegionResponse;
import com.sobi.common.service.MarketService;
import com.sobi.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/common/market")
@RequiredArgsConstructor
public class MarketController {

    private static final String SUCCESS_MESSAGE = "상권 분석 조회 성공.";
    private static final String NO_REVENUE_MESSAGE = "상권 분석 조회 성공. 해당 업종은 매출이 집계되지 않습니다.";

    private final MarketService marketService;

    // 상권 분석 화면 한 개를 그리는 데 필요한 값을 한 번에 내려준다.
    @GetMapping
    public ResponseEntity<ApiResponse<MarketAnalysisResponse>> getMarketAnalysis(
            @RequestParam String dongCode,
            @RequestParam String businessCode,
            @RequestParam(required = false) Integer compareLimit,
            @RequestParam(required = false) Integer mixLimit,
            HttpServletRequest request
    ) {
        MarketAnalysisResponse response = marketService.getMarketAnalysis(
                dongCode,
                businessCode,
                compareLimit,
                mixLimit
        );

        // 행은 있는데 매출 컬럼만 비어 있는 경우도 조회 성공
        String message = response.summary().revenuePerStoreMonthly() == null
                ? NO_REVENUE_MESSAGE
                : SUCCESS_MESSAGE;

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        message,
                        response,
                        request
                ));
    }

    /** 지역 셀렉트 박스 채우기용 목록. */
    @GetMapping("/regions")
    public ResponseEntity<ApiResponse<MarketRegionResponse>> getRegions(
            HttpServletRequest request
    ) {
        MarketRegionResponse response = marketService.getRegions();

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "행정동 목록 조회에 성공하였습니다.",
                        response,
                        request
                ));
    }

    /** 업종 셀렉트 박스 채우기용 목록. */
    @GetMapping("/businesses")
    public ResponseEntity<ApiResponse<MarketBusinessResponse>> getBusinesses(
            HttpServletRequest request
    ) {
        MarketBusinessResponse response = marketService.getBusinesses();

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "업종 목록 조회에 성공하였습니다.",
                        response,
                        request
                ));
    }
}
