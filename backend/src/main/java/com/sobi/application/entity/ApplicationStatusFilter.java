package com.sobi.application.entity;

import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.Set;

// 신청 현황의 진행 중 / 완료 탭. 쿼리 파라미터를 enum 으로 직접 받으면 잘못된 값이 500 으로 떨어져서 from() 으로 변환
public enum ApplicationStatusFilter {

    IN_PROGRESS(EnumSet.of(
            ApplicationStatus.PREPARING,
            ApplicationStatus.SUBMITTED,
            ApplicationStatus.REVIEWING,
            ApplicationStatus.APPROVED
    )),

    // 반려도 더 진행할 것이 없으므로 완료로 묶는다
    DONE(EnumSet.of(
            ApplicationStatus.PAID,
            ApplicationStatus.REJECTED
    ));

    private final Set<ApplicationStatus> statuses;

    ApplicationStatusFilter(Set<ApplicationStatus> statuses) {
        this.statuses = statuses;
    }

    public boolean contains(ApplicationStatus status) {
        return statuses.contains(status);
    }

    // 값이 없으면 전체 조회
    public static ApplicationStatusFilter from(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return Arrays.stream(values())
                .filter(filter -> filter.name().equalsIgnoreCase(value.trim()))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.APPLICATION_STATUS_BAD_REQUEST));
    }
}
