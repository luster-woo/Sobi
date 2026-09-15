package com.sobi.application.dto;

import com.sobi.application.entity.ApplicationDocument;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

// 서류 제출 페이지의 서류 1개
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ApplicationDocumentResponse {

    private final Long applicationDocumentId;   // 업로드 시 이 id 로 채울 행을 지정
    private final String documentName;          // 없으면 null → 프론트에서 기본 문구 표시
    private final String documentType;          // SUBMIT / WRITE
    private final String validationStatus;      // NOT_SUBMITTED / PENDING / VALIDATING / PASSED / FAILED
    private final String validationMessage;     // 검증 실패 사유
    private final String originalFilename;      // 업로드한 파일명 (미제출이면 null)
    private final String draftStatus;           // 작성 서류만: NOT_STARTED / WRITING / WRITTEN

    public static ApplicationDocumentResponse from(ApplicationDocument document) {
        return new ApplicationDocumentResponse(
                document.getId(),
                resolveDocumentName(document),
                document.getDocumentType(),
                document.getValidationStatus(),
                document.getValidationMessage(),
                document.getOriginalFilename(),
                document.getDraftStatus()
        );
    }

    // 대출 서류 / 지원사업 서류 중 연결된 쪽의 이름. 필수 서류가 삭제돼 연결이 끊기면 null
    private static String resolveDocumentName(ApplicationDocument document) {
        if (document.getLoanDocument() != null) {
            return document.getLoanDocument().getDocName();
        }
        if (document.getProgramDocument() != null) {
            return document.getProgramDocument().getDocName();
        }
        return null;
    }
}
