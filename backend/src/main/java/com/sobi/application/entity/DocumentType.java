package com.sobi.application.entity;

// application_document.document_type 값. 컬럼은 String 이라 저장 시 name() 을 사용
public enum DocumentType {
    SUBMIT, // 제출 서류 (AI 검증)
    WRITE;  // 작성 서류 (원본 다운로드 / AI 초안 / 업로드)

    public static DocumentType from(String value) {
        String trimmed = value == null ? "" : value.trim();

        if ("SUBMIT".equalsIgnoreCase(trimmed) || "제출용".equals(trimmed)) {
            return SUBMIT;
        }
        if ("WRITE".equalsIgnoreCase(trimmed) || "작성용".equals(trimmed)) {
            return WRITE;
        }
        // 필수 서류 데이터 자체가 잘못된 경우라 사용자 입력 오류가 아닌 서버 오류로 본다
        throw new IllegalStateException("알 수 없는 서류 구분입니다. type: " + value);
    }
}
