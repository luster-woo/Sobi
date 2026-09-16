package com.sobi.mydata.controller;

import com.sobi.global.response.ApiResponse;
import com.sobi.mydata.dto.MydataLinkResponse;
import com.sobi.mydata.service.MydataService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/mydata")
@RequiredArgsConstructor
public class MydataController {

    private final MydataService mydataService;

    /**
     * 마이데이터 연동. 회원가입 직후 한 번 호출한다.
     * 매출·보험·계좌·신용등급을 수집하고 지원사업 자격을 판정해 저장한다.
     * 응답까지 15~40초 걸린다.
     */
    @PostMapping("/link")
    public ResponseEntity<ApiResponse<MydataLinkResponse>> link(
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request
    ) {

        MydataLinkResponse response = mydataService.link(userId);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "마이데이터 연동과 자격 판정을 완료했습니다.",
                        response,
                        request
                ));
    }

    /**
     * 마이데이터 갱신. 다시 수집하고 자격을 재판정한다.
     * 판정 1회에 GMS 크레딧이 약 100 나가므로 쿨다운이 걸려 있다.
     */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<MydataLinkResponse>> refresh(
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request
    ) {

        MydataLinkResponse response = mydataService.refresh(userId);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "마이데이터 갱신과 자격 재판정을 완료했습니다.",
                        response,
                        request
                ));
    }
}