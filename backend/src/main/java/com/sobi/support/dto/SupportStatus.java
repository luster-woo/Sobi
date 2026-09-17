package com.sobi.support.dto;

import com.sobi.support.entity.JudgementStatus;

/**
 * 지원사업 목록·상세·관심목록의 상태 뱃지.
 * AI 자격 판정과 내 최근 신청 상태를 합친 값이다.
 *
 * 대출(LoanStatus)과 값이 겹치지만 UNKNOWN 이 있는 것이 다르다.
 * 대출 판정은 신용등급·업력 같은 정량 비교라 "모른다"가 나올 수 없고,
 * 지원사업은 공고 문장을 LLM 이 읽어 판정하므로 확인 불가한 조건이 생긴다.
 */
public enum SupportStatus {
    ELIGIBLE,   // 신청 가능
    UNKNOWN,    // 조건 확인 필요
    INELIGIBLE, // 해당 없음
    PREPARING,  // 작성중
    SUBMITTED,  // 신청완료
    REVIEWING,  // 심사중
    APPROVED,   // 승인
    PAID;       // 지급 완료

    private static final String REJECTED = "REJECTED";

    /**
     * @param judged                  AI 자격 판정. 마이데이터 미연동이면 null
     * @param latestApplicationStatus application.status. 신청한 적 없으면 null
     */
    public static SupportStatus of(JudgementStatus judged, String latestApplicationStatus) {

        // 반려는 재신청할 수 있으므로 판정 결과로 되돌린다
        if (latestApplicationStatus == null || REJECTED.equals(latestApplicationStatus)) {

            // 마이데이터 미연동이면 판정 자체가 없다. 모르는 것은 모른다고 둔다
            if (judged == null) {
                return UNKNOWN;
            }
            return switch (judged) {
                case ELIGIBLE -> ELIGIBLE;
                case UNKNOWN -> UNKNOWN;
                case INELIGIBLE -> INELIGIBLE;
            };
        }
        return valueOf(latestApplicationStatus);
    }

    // 신청 상태에서 온 값인지
    public boolean isFromApplication() {
        return this != ELIGIBLE && this != UNKNOWN && this != INELIGIBLE;
    }
}