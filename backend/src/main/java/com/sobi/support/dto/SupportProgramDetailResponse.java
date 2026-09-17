package com.sobi.support.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sobi.support.entity.SuggestSupportProgram;
import com.sobi.support.entity.SupportProgram;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;

/**
 * 지원사업 상세.
 *
 * supportProgramId 는 경로 파라미터라 응답에 담지 않는다.
 * 접수 홈페이지·공고문 링크도 담지 않는다 — 신청이 앱 안에서 끝나는 구조다.
 */
@Getter
@Builder
public class SupportProgramDetailResponse {

    private final String pblancNm;
    private final String bsnsSumryCn;
    private final String jrsdInsttNm;
    private final String excInsttNm;
    private final SupportProgramType type;
    private final LocalDate startDate;
    private final LocalDate endDate;
    private final SupportStatus status;

    // 목록과 마찬가지로 래퍼여야 한다. primitive 면 Jackson 이 "bookmark" 로 직렬화한다
    private final Boolean isBookmark;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private final Long minBalance;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private final Long maxBalance;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private final Double interestRate;

    private final String reqstMthPapersCn;
    private final String refrncNm;

    /** 판정 사유 한 문장. 마이데이터 미연동이면 null */
    private final String reason;

    /** 신청 전 본인이 확인해야 할 항목. 미충족이라는 뜻이 아니다 */
    private final List<String> checkItems;

    /** 우대·가점 조건. 판정에는 쓰이지 않는다 */
    private final List<String> benefits;

    /** 진행 중인 신청이 있을 때만. [이어서 작성] 이동용 */
    private final Long applicationId;

    public static SupportProgramDetailResponse of(
            SupportProgram program,
            SuggestSupportProgram judgement,
            SupportStatus status,
            Long applicationId,
            boolean bookmarked
    ) {
        SupportProgramType type = SupportProgramType.from(program.getType());

        return SupportProgramDetailResponse.builder()
                .pblancNm(program.getPblancNm())
                .bsnsSumryCn(program.getBsnsSumryCn())
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
                .reqstMthPapersCn(program.getReqstMthPapersCn())
                .refrncNm(program.getRefrncNm())
                .reason(judgement == null ? null : judgement.getReason())
                .checkItems(judgement == null ? List.of() : judgement.getCheckItems())
                .benefits(judgement == null ? List.of() : judgement.getBenefits())
                .applicationId(applicationId)
                .build();
    }
}