package com.sobi.support.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 목록 조회 필터. @ModelAttribute 로 바인딩되므로 세터가 필요하다.
 */
@Getter
@Setter
@NoArgsConstructor
public class SupportSearchCondition {

    private static final int MAX_SIZE = 100;

    /** 시도 표준 표기 16개. 전국 공고는 어느 지역을 골라도 포함된다 */
    private String region;

    private SupportProgramType type;

    /** 판정 결과 기준. 신청 상태로는 거르지 않는다 */
    private SupportStatus judgement;

    private Boolean isBookmark;

    /** endDate,asc | maxBalance,desc. 그 외는 기본으로 처리 */
    private String sort;

    private int page = 0;

    private int size = 20;

    public int getSize() {
        return Math.min(Math.max(size, 1), MAX_SIZE);
    }

    public int getPage() {
        return Math.max(page, 0);
    }

    public boolean onlyBookmarked() {
        return Boolean.TRUE.equals(isBookmark);
    }
}