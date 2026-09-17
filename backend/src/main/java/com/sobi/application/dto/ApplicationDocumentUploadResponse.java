package com.sobi.application.dto;

import com.sobi.application.entity.ApplicationDocument;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

// 서류 업로드 결과. 검증 결과는 신청 상세(GET /v1/application/{id})를 폴링해 확인한다
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ApplicationDocumentUploadResponse {

    private final Long applicationDocumentId;
    private final String validationStatus;   // 제출 서류 PENDING (AI 검증 대기) / 작성 서류 PASSED
    private final String originalFilename;

    public static ApplicationDocumentUploadResponse from(ApplicationDocument document) {
        return new ApplicationDocumentUploadResponse(
                document.getId(),
                document.getValidationStatus(),
                document.getOriginalFilename()
        );
    }
}
