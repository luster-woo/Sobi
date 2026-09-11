package com.sobi.business.controller;


import com.sobi.business.dto.*;
import com.sobi.business.service.BusinessService;
import com.sobi.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/business")
@RequiredArgsConstructor
public class BusinessController {

    private final BusinessService businessService;

    @PostMapping("/verify")
    public ResponseEntity<ApiResponse<VerifyResponse>>  verify(
            @Valid @RequestBody VerifyRequest verifyRequest,
            HttpServletRequest request)
    {

        VerifyResponse response = businessService.verify(verifyRequest);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "사업자 번호 기반 정보조회에 성공했습니다.",
                        response,
                        request
                ));

    }

    @PostMapping
    public ResponseEntity<ApiResponse<Void>> business(
            @Valid @RequestBody BusinessRequest businessRequest,
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request
    ){


        businessService.business(businessRequest, userId);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "사업자 번호 기반 정보등록에 성공했습니다.",

                        request
                ));
    }


    @GetMapping("/me")
    public ResponseEntity<ApiResponse<BusinessInfoResponse>>  me(
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request
    ){

        BusinessInfoResponse response = businessService.businessInfo(userId);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "사업자 번호 기반 정보등록에 성공했습니다.",
                        response,
                        request
                ));
    }



}
