package com.sobi.application.entity;

import java.util.EnumSet;
import java.util.Set;

// application.status 값. 
public enum ApplicationStatus {
    PREPARING,  // 신청 준비중 (서류 작성 중)
    SUBMITTED,  // 신청 완료
    REVIEWING,  // 심사 중
    APPROVED,   // 승인
    REJECTED,   // 반려
    PAID;       // 지급 완료(대출) / 지원 완료(지원사업)

    // 새 신청을 막아야 하는 상태 (진행 중이거나 이미 지급됨)
    private static final Set<ApplicationStatus> BLOCKING_NEW_APPLICATION =
            EnumSet.of(SUBMITTED, REVIEWING, APPROVED, PAID);

    public boolean blocksNewApplication() {
        return BLOCKING_NEW_APPLICATION.contains(this);
    }
}
