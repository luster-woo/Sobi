package com.sobi.application.entity;

// application_document.draft_status 값 (작성 서류만). 컬럼은 String 이라 저장 시 name() 을 사용
public enum DraftStatus {
    NOT_STARTED,    // 아직 시작 안 함 (작성 실패 시에도 여기로 복귀)
    WRITING,        // AI 초안 작성 중
    WRITTEN         // AI 초안 작성 완료
}
