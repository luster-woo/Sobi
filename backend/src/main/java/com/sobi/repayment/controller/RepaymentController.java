//package com.sobi.repayment.controller;
//
//import com.sobi.global.external.ssafy.header.SsafyRequestHeader;
//import com.sobi.global.response.ApiResponse;
//import com.sobi.repayment.dto.LoanListResponse;
//import com.sobi.repayment.service.RepaymentService;
//import jakarta.servlet.http.HttpServletRequest;
//import lombok.RequiredArgsConstructor;
//import org.springframework.http.HttpStatus;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.PostMapping;
//import org.springframework.web.bind.annotation.RequestBody;
//import org.springframework.web.bind.annotation.RequestMapping;
//import org.springframework.web.bind.annotation.RestController;
//
//@RestController
//@RequestMapping("/repayment/finan")//박성현 화이팅
//@RequiredArgsConstructor
//public class RepaymentController {
//
//    private final RepaymentService repaymentService;
//
//
//    @PostMapping("/list")
//    public ResponseEntity<ApiResponse<LoanListResponse>> getLoanList(
//
//            HttpServletRequest request
//    ) {
//
//        Long userId = 1L;
//
//        LoanListResponse response = repaymentService.getList(userId);
//
//        return ResponseEntity
//                .status(HttpStatus.OK)
//                .body(ApiResponse.success(
//                        HttpStatus.OK,
//                        "내 대출 상품 리스트 조회에 성공했습니다.",
//                        response,
//                        request
//                ));
//
//    }
//}
