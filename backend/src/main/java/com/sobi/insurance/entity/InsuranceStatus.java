package com.sobi.insurance.entity;

/**
 * COMPLETED 는 마이데이터가, REQUIRED/EXEMPT 는 사용자가 결정
 * NEEDS_VERIFICATION 사용자가 상세 내용을 보고 둘 중 하나를 고른다.
 */
public enum InsuranceStatus {

    /** 가입 완료 */
    COMPLETED,

    /** 확인 필요 — 미가입이지만 의무 대상인지 사용자가 판단 */
    NEEDS_VERIFICATION,

    /** 가입 필요 */
    REQUIRED,

    /** 가입 제외 — 업종은 해당되나 이 업체는 조건 미달 */
    EXEMPT;

    /** 사용자가 확인 필요 항목에서 고를 수 있는 값인지 */
    public boolean isUserSelectable() {
        return this == REQUIRED || this == EXEMPT;
    }
}
