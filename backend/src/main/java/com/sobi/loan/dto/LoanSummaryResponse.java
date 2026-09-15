package com.sobi.loan.dto;

import com.sobi.loan.entity.Loan;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

// 대출 상품 목록의 카드 1개
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class LoanSummaryResponse {

    private final Long loanId;
    private final String accountName;
    private final String bankName;
    private final Double interestRate;
    private final Long maxLoanBalance;
    private final LoanStatus status;
    private final boolean bookmarked;

    public static LoanSummaryResponse of(Loan loan, LoanStatus status, boolean bookmarked) {
        return new LoanSummaryResponse(
                loan.getId(),
                loan.getAccountName(),
                loan.getBankName(),
                loan.getInterestRate(),
                loan.getMaxLoanBalance(),
                status,
                bookmarked
        );
    }
}
