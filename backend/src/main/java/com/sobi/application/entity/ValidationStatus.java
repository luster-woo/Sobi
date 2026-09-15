package com.sobi.application.entity;

// application_document.validation_status 값. 
public enum ValidationStatus {
    NOT_SUBMITTED,  // 아직 안 올림
    PENDING,        // 검증 대기
    VALIDATING,     // 검증 처리 중
    PASSED,         // 검증 통과 (작성 서류는 업로드 즉시)
    FAILED          // 검증 실패
}
