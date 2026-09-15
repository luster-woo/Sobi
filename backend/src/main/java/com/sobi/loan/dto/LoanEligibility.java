package com.sobi.loan.dto;

// 사용자 기준 대출 상품 신청 가능 여부 (신청 완료·보유 중은 신청 API 구현 시 추가)
public enum LoanEligibility {
    ELIGIBLE,   // 가능
    INELIGIBLE  // 불가
}
