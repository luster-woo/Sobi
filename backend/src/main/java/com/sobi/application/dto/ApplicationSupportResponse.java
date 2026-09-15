package com.sobi.application.dto;

import com.sobi.support.entity.SupportProgram;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDate;

// 서류 제출 페이지 상단의 지원사업 요약
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ApplicationSupportResponse {

    private final Long supportProgramId;
    private final String programName;       // 공고명
    private final String jurisdiction;      // 소관기관
    private final String supportType;       // 지원 형태: 지원금 / 대출 / 기타 → 기타면 금액·계좌 입력란 숨김
    private final LocalDate startDate;
    private final LocalDate endDate;
    private final Long minBalance;
    private final Long maxBalance;

    public static ApplicationSupportResponse from(SupportProgram program) {
        return new ApplicationSupportResponse(
                program.getId(),
                program.getPblancNm(),
                program.getJrsdinsttNm(),
                program.getType(),
                program.getStartDate(),
                program.getEndDate(),
                program.getMinBalance(),
                program.getMaxBalance()
        );
    }
}
