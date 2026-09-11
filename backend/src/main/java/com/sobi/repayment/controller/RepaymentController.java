package com.sobi.repayment.controller;

import com.sobi.global.external.ssafy.header.SsafyRequestHeader;
import com.sobi.global.response.ApiResponse;
import com.sobi.repayment.dto.LoanBalanceInFullRequest;
import com.sobi.repayment.dto.LoanListResponse;
import com.sobi.repayment.dto.RecordRequest;
import com.sobi.repayment.dto.RecordResponse;
import com.sobi.repayment.service.RepaymentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/repayment/finan")//박성현 화이팅
@RequiredArgsConstructor
public class RepaymentController {

    private final RepaymentService repaymentService;


    @PostMapping("/list")
    public ResponseEntity<ApiResponse<LoanListResponse>> getLoanList(
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request
    ) {


        LoanListResponse response = repaymentService.getList(userId);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "내 대출 상품 리스트 조회에 성공했습니다.",
                        response,
                        request
                ));

    }

    @PostMapping("/records")
    public ResponseEntity<ApiResponse<RecordResponse>> getLoanList(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody RecordRequest recordRequest,
            HttpServletRequest request
    ) {


        RecordResponse response = repaymentService.getRecord(userId, recordRequest);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "내 대출 상환 내역 조회에 성공했습니다.",
                        response,
                        request
                ));

    }


    @PostMapping("/loanBalanceInFull")
    public ResponseEntity<ApiResponse<Void>> loanBalanceInFull(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody LoanBalanceInFullRequest loanBalanceInFullRequest,
            HttpServletRequest request
            ){

        repaymentService.loanBalanceInFull(loanBalanceInFullRequest, userId);


        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "해당 대출 상품 일시납 상환에 성공했습니다.",
                        request
                ));
    }
}
