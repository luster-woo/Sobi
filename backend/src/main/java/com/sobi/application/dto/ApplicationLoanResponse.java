package com.sobi.application.dto;

import com.sobi.loan.entity.Loan;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

// 서류 제출 페이지 상단의 대출 상품 요약
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ApplicationLoanResponse {

    private final Long loanId;
    private final String accountName;
    private final String bankName;
    private final Double interestRate;
    private final Long minLoanBalance;
    private final Long maxLoanBalance;

    public static ApplicationLoanResponse from(Loan loan) {
        return new ApplicationLoanResponse(
                loan.getId(),
                loan.getAccountName(),
                loan.getBankName(),
                loan.getInterestRate(),
                loan.getMinLoanBalance(),
                loan.getMaxLoanBalance()
        );
    }
}
