package com.sobi.support.entity;

import java.util.Arrays;

/**
 * AI 자격 판정 결과. suggest_support_program.status 에 저장된다.
 *
 * DB 값은 AI 계약(ai/docs/02_api_contract.md)과 같은 소문자다.
 * 판정이 이상할 때 AI 응답과 DB 행을 그대로 대조할 수 있도록 표기를 맞췄다.
 */
public enum JudgementStatus {

    /** 확인 가능한 조건을 모두 충족 */
    ELIGIBLE("eligible"),

    /** "해당해야만 통과"하는 조건을 확인할 수 없음 */
    UNKNOWN("unknown"),

    /** 확인 가능한 조건이 명확히 어긋남 */
    INELIGIBLE("ineligible");

    private final String dbValue;

    JudgementStatus(String dbValue) {
        this.dbValue = dbValue;
    }

    public String getDbValue() {
        return dbValue;
    }

    /**
     * AI 응답에는 스키마 검증이 없어 LLM 이 엉뚱한 값을 뱉을 수 있다.
     * 알 수 없는 값은 UNKNOWN 으로 둔다. CHECK 제약에 걸려 222건 전체가
     * 날아가는 것보다 낫다.
     */
    public static JudgementStatus from(String value) {
        return Arrays.stream(values())
                .filter(status -> status.dbValue.equals(value))
                .findFirst()
                .orElse(UNKNOWN);
    }
}