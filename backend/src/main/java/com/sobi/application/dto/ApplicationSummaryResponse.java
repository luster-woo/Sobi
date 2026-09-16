package com.sobi.application.dto;

import com.sobi.application.entity.Application;
import com.sobi.application.entity.ApplicationType;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

// 신청 현황의 카드 1개
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ApplicationSummaryResponse {

    private final Long applicationId;
    private final ApplicationType type;     // 대상이 삭제되면 null
    private final Long programId;           // 대출 상품 id 또는 지원사업 id
    private final String programName;
    private final String status;
    private final String rejectReason;
    private final Long amount;              // 제출 전에는 null
    private final LocalDateTime subjectAt;  // 접수일
    private final LocalDateTime completeAt;

    public static ApplicationSummaryResponse from(Application application) {
        return new ApplicationSummaryResponse(
                application.getId(),
                resolveType(application),
                resolveProgramId(application),
                resolveProgramName(application),
                application.getStatus(),
                application.getRejectReason(),
                application.getAmount(),
                application.getSubjectAt(),
                application.getCompleteAt()
        );
    }

    private static ApplicationType resolveType(Application application) {
        if (application.getLoan() != null) {
            return ApplicationType.LOAN;
        }
        if (application.getSupportProgram() != null) {
            return ApplicationType.SUPPORT;
        }
        return null;
    }

    // 상품·사업이 삭제되면 id 와 이름이 없다
    private static Long resolveProgramId(Application application) {
        if (application.getLoan() != null) {
            return application.getLoan().getId();
        }
        return application.getSupportProgram() == null ? null : application.getSupportProgram().getId();
    }

    private static String resolveProgramName(Application application) {
        if (application.getLoan() != null) {
            return application.getLoan().getAccountName();
        }
        return application.getSupportProgram() == null ? null : application.getSupportProgram().getPblancNm();
    }
}
