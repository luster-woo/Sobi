package com.sobi.account.controller;


import com.sobi.account.dto.AccountResponse;
import com.sobi.account.service.AccountService;
import com.sobi.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/account")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @GetMapping("/list")
    public ResponseEntity<ApiResponse<AccountResponse>> listAccounts(

            HttpServletRequest request
    ) {
        Long userId = 1L;

        AccountResponse response = accountService.getAccountByUserId(userId);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "내 계좌 조회에 성공하였습니다.",
                        response,
                        request
                ));
    }
}
