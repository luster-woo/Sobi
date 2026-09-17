package com.sobi.support.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sobi.support.entity.SupportProgram;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

/**
 * 목록의 공고 한 건.
 *
 * 금액·금리는 type 에 따라 없을 수 있어 null 이면 응답에서 뺀다.
 * startDate·endDate 는 상시 공고에서 null 일 수 있는데, 화면이 null 을 기대하므로
 * 그대로 내보낸다.
 */
@Getter
@Builder
public class SupportProgramSummaryResponse {

    private final Long supportProgramId;
    private final String pblancNm;
    private final String jrsdInsttNm;
    private final String excInsttNm;
    private final SupportProgramType type;
    private final LocalDate startDate;
    private final LocalDate endDate;
    private final SupportStatus status;

    // Boolean(래퍼)이어야 한다. primitive 면 Lombok 이 isBookmark() 를 만들고
    // Jackson 이 "bookmark" 로 직렬화해 화면과 이름이 어긋난다.
    private final Boolean isBookmark;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private final Long minBalance;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private final Long maxBalance;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private final Double interestRate;

    public static SupportProgramSummaryResponse of(
            SupportProgram program,
            SupportStatus status,
            boolean bookmarked
    ) {
        SupportProgramType type = SupportProgramType.from(program.getType());

        return SupportProgramSummaryResponse.builder()
                .supportProgramId(program.getId())
                .pblancNm(program.getPblancNm())
                .jrsdInsttNm(program.getJrsdinsttNm())
                .excInsttNm(program.getExcinsttNm())
                .type(type)
                .startDate(program.getStartDate())
                .endDate(program.getEndDate())
                .status(status)
                .isBookmark(bookmarked)
                .minBalance(type == SupportProgramType.ETC ? null : program.getMinBalance())
                .maxBalance(type == SupportProgramType.ETC ? null : program.getMaxBalance())
                .interestRate(type == SupportProgramType.LOAN ? program.getInterestRate() : null)
                .build();
    }
}