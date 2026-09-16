package com.sobi.loan.clientDto;

import lombok.Getter;
import lombok.NoArgsConstructor;

// 대출심사 결과. 금융망은 숫자도 문자열로 내려준다
@Getter
@NoArgsConstructor
public class SsafyLoanApplication {

    private String accountTypeUniqueNo;
    private String status;          // 승인 / 거절 (신용등급 기준 미달)
    private String bankCode;
    private String bankName;
    private String ratingUniqueNo;
    private String ratingName;
    private String accountName;
    private String loanPeriod;
    private String minLoanBalance;
    private String maxLoanBalance;
    private String interestRate;
    private String accountDescription;
    private String applicationDate;
    private String applicationTime;
    private String decisionDate;
    private String decisionTime;
}
