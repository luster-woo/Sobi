package com.sobi.global.external.ai.clientDto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/** 공고 한 건의 판정 결과. */
@Getter
@NoArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class RagResult {

    private Long programId;

    private String pblancId;

    private String title;

    /** 코사인 거리. SQL 필터 탈락 건은 null. */
    private Double distance;

    /** eligible | unknown | ineligible */
    private String status;

    private String reason;

    private List<String> checkItems;

    private List<String> benefits;

    /** llm | sql */
    private String judgedBy;
}