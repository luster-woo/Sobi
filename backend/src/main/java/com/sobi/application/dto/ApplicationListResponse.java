package com.sobi.application.dto;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

/**
 * 개수는 필터 적용 전 전체 신청 기준, applications 는 필터 적용 결과
 */
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ApplicationListResponse {

    private final int totalCount;
    private final int inProgressCount;
    private final int doneCount;
    private final List<ApplicationSummaryResponse> applications;

    public static ApplicationListResponse of(int totalCount, int inProgressCount, List<ApplicationSummaryResponse> applications) {
        return new ApplicationListResponse(
                totalCount,
                inProgressCount,
                totalCount - inProgressCount,
                applications
        );
    }
}
