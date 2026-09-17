package com.sobi.dashboard.controller;

import com.sobi.dashboard.dto.DashboardResponse;
import com.sobi.dashboard.service.DashboardService;
import com.sobi.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {
    private final DashboardService dashboardService;

    @GetMapping
    public ResponseEntity<ApiResponse<DashboardResponse>> getDashboard(
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request) {

        DashboardResponse response = dashboardService.getDashboard(userId);

        return ResponseEntity.ok(ApiResponse.success(
                HttpStatus.OK,
                "대시보드 조회에 성공하였습니다.",
                response,
                request));
    }
}
