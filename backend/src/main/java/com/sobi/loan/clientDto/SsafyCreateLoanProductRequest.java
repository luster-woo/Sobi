package com.sobi.loan.clientDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.sobi.global.external.ssafy.header.SsafyRequestHeader;
import lombok.Builder;
import lombok.Getter;

/**
 * 2.7.2 대출 상품 등록 요청.
 * 숫자 필드도 금융망 요청 예시와 동일하게 문자열로 전송한다.
 */
@Getter
@Builder
public class SsafyCreateLoanProductRequest {

    @JsonProperty("Header")
    private SsafyRequestHeader header;

    private String bankCode;
    private String accountName;         // 20자 이하
    private String accountDescription;  // 255자 이하, 선택
    private String ratingUniqueNo;      // 가입 가능한 최소 신용등급
    private String loanPeriod;          // 2 ~ 365 (일)
    private String minLoanBalance;      // 1,000원 이상
    private String maxLoanBalance;      // 3억 원 이하
    private String interestRate;        // 0.1 ~ 20 (%)
}
