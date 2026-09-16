package com.sobi.loan.clientDto;

import lombok.Getter;
import lombok.NoArgsConstructor;

// 대출 가입 결과 (개설된 대출 계좌)
@Getter
@NoArgsConstructor
public class SsafyLoanAccount {

    private String accountNo;               // 대출 계좌번호 (잔액이 아닌 갚을 금액을 관리)
    private String accountName;
    private String status;                  // 개설 / 상환중 / 연체
    private String accountTypeUniqueNo;
    private String loanPeriod;
    private String loanDate;
    private String maturityDate;
    private String loanBalance;
    private String interestRate;
    private String withdrawalAccountNo;
}
