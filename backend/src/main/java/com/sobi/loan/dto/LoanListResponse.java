package com.sobi.loan.dto;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * 개수는 필터 적용 전 전체 상품 기준, loans 는 필터·정렬 적용 결과.
 */
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class LoanListResponse {

    private final int totalCount;
    private final Map<LoanStatus, Integer> statusCounts;    // 7개 상태 키를 항상 모두 포함 (없으면 0)
    private final List<LoanSummaryResponse> loans;

    public static LoanListResponse of(List<LoanSummaryResponse> all, List<LoanSummaryResponse> filtered) {

        // 프론트가 키 존재 여부를 따지지 않도록 모든 상태를 0 으로 채운 뒤 센다
        Map<LoanStatus, Integer> statusCounts = new EnumMap<>(LoanStatus.class);
        for (LoanStatus status : LoanStatus.values()) {
            statusCounts.put(status, 0);
        }
        all.forEach(loan -> statusCounts.merge(loan.getStatus(), 1, Integer::sum));

        return new LoanListResponse(all.size(), statusCounts, filtered);
    }
}
