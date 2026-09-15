package com.sobi.loan.dto;

import com.sobi.loan.entity.Loan;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class LoanDetailResponse {

    // 금융망 대출 상품은 원리금균등상환 고정
    private static final String REPAYMENT_METHOD = "원리금균등상환";

    private final Long loanId;
    private final String accountName;
    private final String bankName;
    private final String description;
    private final Double interestRate;
    private final Long minLoanBalance;
    private final Long maxLoanBalance;
    private final Integer period;           // 대출 기간(일)
    private final String repaymentMethod;
    private final LoanConditionResponse conditions;
    private final LoanEligibility eligibility;
    private final List<String> ineligibleReasons;
    private final boolean bookmarked;

    public static LoanDetailResponse of(Loan loan, EligibilityResult eligibilityResult, boolean bookmarked) {
        return new LoanDetailResponse(
                loan.getId(),
                loan.getAccountName(),
                loan.getBankName(),
                loan.getDescription(),
                loan.getInterestRate(),
                loan.getMinLoanBalance(),
                loan.getMaxLoanBalance(),
                loan.getPeriod(),
                REPAYMENT_METHOD,
                LoanConditionResponse.from(loan),
                eligibilityResult.getEligibility(),
                eligibilityResult.getIneligibleReasons(),
                bookmarked
        );
    }
}
