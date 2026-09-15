package com.sobi.loan.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 대출 상품 목록 조회 쿼리 파라미터.
 */
@Getter
@Setter
@NoArgsConstructor
public class LoanSearchCondition {

    private String keyword;                 // 상품명·은행명 포함 검색
    private String bankName;                // 취급 기관
    private LoanStatus status;              // 상태 (가능 / 불가 / 작성중 / 신청완료 / 심사중 / 승인 / 지급 완료)
    private boolean bookmarked;             // true 면 즐겨찾기한 상품만
    private LoanSortType sort = LoanSortType.INTEREST_RATE;
}
