package com.sobi.loan.dto;

/**
 * 대출 상품 목록·상세의 상태 뱃지. 조건 판정(가능/불가)과 내 최근 신청 상태를 합친 값
 * 최근 신청이 없거나 반려(REJECTED)면 조건 판정 결과, 그 외에는 신청 상태를 그대로 쓴다
 */
public enum LoanStatus {
    ELIGIBLE,   // 가능
    INELIGIBLE, // 불가
    PREPARING,  // 작성중
    SUBMITTED,  // 신청완료
    REVIEWING,  // 심사중
    APPROVED,   // 승인
    PAID;       // 지급 완료

    private static final String REJECTED = "REJECTED";

    /**
     * @param latestApplicationStatus 이 상품에 대한 내 최근 신청 상태 (application.status). 없으면 null
     */
    public static LoanStatus of(LoanEligibility eligibility, String latestApplicationStatus) {

        // 반려는 재신청할 수 있으므로 조건 판정으로 되돌린다
        if (latestApplicationStatus == null || REJECTED.equals(latestApplicationStatus)) {
            return eligibility == LoanEligibility.ELIGIBLE ? ELIGIBLE : INELIGIBLE;
        }
        return valueOf(latestApplicationStatus);
    }

    // 신청 상태에서 온 값인지 (상세에서 applicationId 를 내려줄지 판단)
    public boolean isFromApplication() {
        return this != ELIGIBLE && this != INELIGIBLE;
    }
}
