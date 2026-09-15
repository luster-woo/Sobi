package com.sobi.loan.dto;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

/**
 * 판정 결과. 목록은 eligibility 만, 상세는 불가 사유까지 사용
 */
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class EligibilityResult {

    private final LoanEligibility eligibility;
    private final List<String> ineligibleReasons;

    // 사유가 하나도 없으면 가능
    public static EligibilityResult from(List<String> ineligibleReasons) {
        return new EligibilityResult(
                ineligibleReasons.isEmpty() ? LoanEligibility.ELIGIBLE : LoanEligibility.INELIGIBLE,
                List.copyOf(ineligibleReasons)
        );
    }
}
