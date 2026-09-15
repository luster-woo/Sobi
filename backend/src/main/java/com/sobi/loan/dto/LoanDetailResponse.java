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
    private final LoanStatus status;
    private final Long applicationId;       // 진행 중인 신청이 있을 때만 ([이어서 작성] 이동용), 없으면 null
    private final List<String> ineligibleReasons; // 작성 중이어도 조건이 바뀌었을 수 있어 항상 내려준다
    private final boolean bookmarked;

    public static LoanDetailResponse of(
            Loan loan,
            EligibilityResult eligibilityResult,
            LoanStatus status,
            Long applicationId,
            boolean bookmarked
    ) {
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
                status,
                applicationId,
                eligibilityResult.getIneligibleReasons(),
                bookmarked
        );
    }
}
