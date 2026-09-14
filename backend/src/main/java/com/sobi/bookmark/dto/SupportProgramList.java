package com.sobi.bookmark.dto;

import com.sobi.support.entity.SupportProgram;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@Builder

public class SupportProgramList {
    private Long supportProgramId;

    private String pblancNm;

    private String jrsdInsttNm;

    private Long minBalance;

    private Long maxBalance;

    private LocalDate endDate;

    private Double interestRateOfSP;

    private String status;

    public static SupportProgramList from (SupportProgram supportProgram) {
        return SupportProgramList.builder()
                .supportProgramId(supportProgram.getId())
                .pblancNm(supportProgram.getPblancNm())
                .jrsdInsttNm(supportProgram.getJrsdinsttNm())
                .minBalance(supportProgram.getMinBalance())
                .maxBalance(supportProgram.getMaxBalance())
                .endDate(supportProgram.getEndDate())
                .interestRateOfSP(supportProgram.getInterestRate())
                .status("임시")
                .build();
    }



}
