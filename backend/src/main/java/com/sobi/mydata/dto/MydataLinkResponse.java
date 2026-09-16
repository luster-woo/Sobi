package com.sobi.mydata.dto;

import com.sobi.global.external.ai.clientDto.RagResult;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * 마이데이터 연동 결과 요약.
 * 공고 목록 자체는 지원사업 목록 조회 API 가 돌려준다.
 */
@Getter
@Builder
public class MydataLinkResponse {

    private final int totalCount;
    private final int eligibleCount;
    private final int unknownCount;
    private final int ineligibleCount;

    public static MydataLinkResponse from(List<RagResult> results) {
        return MydataLinkResponse.builder()
                .totalCount(results.size())
                .eligibleCount(count(results, "eligible"))
                .unknownCount(count(results, "unknown"))
                .ineligibleCount(count(results, "ineligible"))
                .build();
    }

    private static int count(List<RagResult> results, String status) {
        return (int) results.stream()
                .filter(r -> status.equals(r.getStatus()))
                .count();
    }
}