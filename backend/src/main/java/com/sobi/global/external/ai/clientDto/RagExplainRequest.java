package com.sobi.global.external.ai.clientDto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

/**
 * POST /rag/explain 요청. 계약은 ai/docs/08_explain.md.
 *
 * <p>프로필 일곱 개는 {@link RagRecommendRequest} 와 같아야 한다. AI 는 이
 * 값으로 벡터를 만들어 공고 원문에서 근거 청크를 고르므로, 추천 때와 다른
 * 프로필을 보내면 판정이 본 것과 다른 대목으로 설명하게 된다.
 * 그래서 {@code MydataStore.read()} 가 준 값을 그대로 넘긴다.
 *
 * <p>status 는 이미 확정된 판정이다. AI 는 이것을 사실로 받고 다시 판정하지
 * 않는다. 생성 쪽에 판단을 맡기면 판정과 설명이 어긋난다.
 */
@Getter
@Builder
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class RagExplainRequest {

    private final Long programId;

    /** eligible / ineligible / unknown */
    private final String status;

    private final String region;

    private final String address;

    private final String businessCode;

    private final Integer employeeCount;

    private final LocalDate openDate;

    private final Long annualRevenue;

    private final LocalDate birthDate;
}
