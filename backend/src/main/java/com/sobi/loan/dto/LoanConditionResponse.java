package com.sobi.loan.dto;

import com.sobi.loan.entity.Loan;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

// 대출 상품의 신청 조건
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class LoanConditionResponse {

    private final String ratingName;        // 최소 신용등급
    private final boolean requiresStart;    // 사업 개시 필요 여부
    private final boolean requiresEmployee; // 근로자 1명 이상 필요 여부
    private final int firmAge;              // 최소 업력(년)

    public static LoanConditionResponse from(Loan loan) {
        return new LoanConditionResponse(
                loan.getRatingName(),
                loan.getIsStart(),
                loan.getEmployeeNum(),
                loan.getFirmAge()
        );
    }
}
