package com.sobi.global.external.ai.clientDto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

/**
 * POST /rag/recommend 요청. 계약은 ai/docs/02_api_contract.md.
 * annual_revenue 와 birth_date 는 선택이며, 없으면 각각
 * 매출 조건 통과 처리 / 연령 조건 unknown 으로 남는다.
 */
@Getter
@Builder
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class RagRecommendRequest {

    /** 시도 표준 표기 16개. 전남과 광주는 '전남광주' 하나다. */
    private final String region;

    private final String address;

    /** CS 업종 소분류 코드 (minor_code.code) */
    private final String businessCode;

    private final Integer employeeCount;

    private final LocalDate openDate;

    private final Long annualRevenue;

    private final LocalDate birthDate;
}