package com.sobi.loan.dto;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

/**
 * 개수는 필터 적용 전 전체 상품 기준, loans 는 필터·정렬 적용 결과.
 */
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class LoanListResponse {

    private final int totalCount;
    private final int eligibleCount;
    private final int ineligibleCount;
    private final List<LoanSummaryResponse> loans;

    public static LoanListResponse of(List<LoanSummaryResponse> all, List<LoanSummaryResponse> filtered) {
        int eligibleCount = (int) all.stream()
                .filter(loan -> loan.getEligibility() == LoanEligibility.ELIGIBLE)
                .count();

        return new LoanListResponse(
                all.size(),
                eligibleCount,
                all.size() - eligibleCount,
                filtered
        );
    }
}
