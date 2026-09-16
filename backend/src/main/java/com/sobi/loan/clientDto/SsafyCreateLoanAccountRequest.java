package com.sobi.loan.clientDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.sobi.global.external.ssafy.header.SsafyRequestHeader;
import lombok.Builder;
import lombok.Getter;

/**
 * 2.7.7 대출 상품 가입 요청. 숫자 필드도 금융망 요청 예시와 동일하게 문자열로 전송한다
 */
@Getter
@Builder
public class SsafyCreateLoanAccountRequest {

    @JsonProperty("Header")
    private SsafyRequestHeader header;

    private String accountTypeUniqueNo;
    private String loanBalance;             // 대출금
    private String withdrawalAccountNo;     // 수시입출금 계좌 (대출금 지급 + 자동 상환)
}
