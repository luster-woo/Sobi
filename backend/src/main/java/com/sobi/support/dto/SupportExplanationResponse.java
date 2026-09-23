package com.sobi.support.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * 판정 사유 설명.
 *
 * <p>null 일 수 있다. 판정이 없거나(예비창업자, 마이데이터 연동 전) AI 생성이
 * 실패한 경우다. 프런트는 이때 상세 응답의 reason 을 그대로 쓰면 된다.
 */
@Getter
@Builder
public class SupportExplanationResponse {

    private final String explanation;

    public static SupportExplanationResponse of(String explanation) {
        return SupportExplanationResponse.builder()
                .explanation(explanation)
                .build();
    }
}
