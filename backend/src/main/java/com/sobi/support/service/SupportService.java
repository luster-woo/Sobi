package com.sobi.support.service;

import com.sobi.support.dto.SupportProgramDetailResponse;
import com.sobi.support.dto.SupportProgramListResponse;
import com.sobi.support.dto.SupportSearchCondition;

public interface SupportService {

    SupportProgramListResponse getPrograms(Long userId, SupportSearchCondition condition);

    SupportProgramDetailResponse getProgram(Long userId, Long supportProgramId);

    SupportProgramListResponse searchPrograms(Long userId, String query, int page, int size);

    /**
     * 판정 사유 설명. 한 번 만들면 저장해 두고 재사용한다.
     *
     * <p>판정이 없으면(예비창업자, 마이데이터 연동 전) null 이다.
     * AI 생성에 실패했을 때도 null 이다 — 호출한 쪽은 기존 reason 을 쓰면 된다.
     */
    String getExplanation(Long userId, Long supportProgramId);
}