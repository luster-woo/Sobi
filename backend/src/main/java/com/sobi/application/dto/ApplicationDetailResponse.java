package com.sobi.application.dto;

import com.sobi.application.entity.Application;
import com.sobi.application.entity.ApplicationDocument;
import com.sobi.application.entity.ApplicationType;
import com.sobi.application.entity.ValidationStatus;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

/**
 * 신청 상세 (서류 제출 페이지). 완료 개수는 검증 통과(PASSED)한 서류 수
 */
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ApplicationDetailResponse {

    private final Long applicationId;
    private final ApplicationType type;
    private final String status;
    private final String rejectReason;
    private final ApplicationLoanResponse loan;         // 대출 신청이 아니거나 상품이 삭제되면 null
    private final ApplicationSupportResponse support;   // 지원사업 신청이 아니거나 사업이 삭제되면 null
    private final List<ApplicationDocumentResponse> documents;
    private final int completedCount;
    private final int totalCount;

    public static ApplicationDetailResponse of(Application application, List<ApplicationDocument> documents) {
        int completedCount = (int) documents.stream()
                .filter(document -> ValidationStatus.PASSED.name().equals(document.getValidationStatus()))
                .count();

        return new ApplicationDetailResponse(
                application.getId(),
                resolveType(application),
                application.getStatus(),
                application.getRejectReason(),
                application.getLoan() == null ? null : ApplicationLoanResponse.from(application.getLoan()),
                application.getSupportProgram() == null ? null : ApplicationSupportResponse.from(application.getSupportProgram()),
                documents.stream()
                        .map(ApplicationDocumentResponse::from)
                        .toList(),
                completedCount,
                documents.size()
        );
    }

    // loan_id / support_program_id 중 값이 있는 쪽으로 종류를 판단 (대상이 삭제되면 null)
    private static ApplicationType resolveType(Application application) {
        if (application.getLoan() != null) {
            return ApplicationType.LOAN;
        }
        if (application.getSupportProgram() != null) {
            return ApplicationType.SUPPORT;
        }
        return null;
    }
}
