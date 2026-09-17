package com.sobi.application.entity;


import com.sobi.loan.entity.LoanDocument;
import com.sobi.support.entity.ProgramDocument;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "application_document")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class ApplicationDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    // 대출 신청 시 해당 필수 서류
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_document_id")
    private LoanDocument loanDocument;

    // 지원사업 신청 시 해당 필수 서류 (대출 서류와 둘 중 최대 하나)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "program_document_id")
    private ProgramDocument programDocument;

    @Column(name = "document_type", nullable = false, length = 50)
    private String documentType;

    // 미제출 행은 파일이 없어 NULL
    @Column(name = "original_filename", length = 255)
    private String originalFilename;

    @Column(name = "stored_path", length = 500)
    private String storedPath;

    @Column(name = "validation_status", nullable = false, length = 50)
    private String validationStatus;

    @Column(name = "validation_message", length = 255)
    private String validationMessage;

    // 작성 서류만: NOT_STARTED / WRITING / WRITTEN (제출 서류는 NULL)
    @Column(name = "draft_status", length = 20)
    private String draftStatus;

    // 작성 서류만: AI 초안 파일 위치.
    @Column(name = "draft_path", length = 500)
    private String draftPath;

    @Column(
            name = "created_at",
            nullable = false,
            insertable = false,
            updatable = false
    )
    private LocalDateTime createdAt;

    @Column(
            name = "updated_at",
            nullable = false,
            insertable = false
    )
    private LocalDateTime updatedAt;

    // 대출 신청 생성 시 필수 서류마다 파일 없이 미리 만드는 미제출 행
    public static ApplicationDocument notSubmitted(Application application, LoanDocument loanDocument) {
        return notSubmittedBuilder(application, DocumentType.from(loanDocument.getType()))
                .loanDocument(loanDocument)
                .build();
    }

    // 지원사업 신청 생성 시 필수 서류마다 파일 없이 미리 만드는 미제출 행
    public static ApplicationDocument notSubmitted(Application application, ProgramDocument programDocument) {
        return notSubmittedBuilder(application, DocumentType.from(programDocument.getType()))
                .programDocument(programDocument)
                .build();
    }

    /**
     * 파일 업로드(첫 업로드·재업로드 공통). 제출 서류는 AI 검증 대기(PENDING), 작성 서류는 검증 없이 바로 통과.
     * 검증 실패 사유는 새 파일 기준으로 다시 정해지므로 지운다.
     */
    public void upload(String originalFilename, String storedPath, LocalDateTime now) {
        this.originalFilename = originalFilename;
        this.storedPath = storedPath;
        this.validationMessage = null;
        this.validationStatus = DocumentType.valueOf(documentType) == DocumentType.WRITE
                ? ValidationStatus.PASSED.name()
                : ValidationStatus.PENDING.name();
        // updated_at 을 갱신하는 DB 트리거가 없다. 검증 시간 초과 판단에 쓰므로 직접 넣는다
        this.updatedAt = now;
    }

    // AI 검증 대기 또는 진행 중. 이때 파일을 바꾸면 결과가 어느 파일 것인지 알 수 없어 재업로드를 막는다
    public boolean isValidating() {
        return ValidationStatus.PENDING.name().equals(validationStatus)
                || ValidationStatus.VALIDATING.name().equals(validationStatus);
    }

    private static ApplicationDocumentBuilder notSubmittedBuilder(Application application, DocumentType documentType) {
        return ApplicationDocument.builder()
                .application(application)
                .documentType(documentType.name())
                .validationStatus(ValidationStatus.NOT_SUBMITTED.name())
                // AI 초안 상태는 작성 서류만 가진다
                .draftStatus(documentType == DocumentType.WRITE ? DraftStatus.NOT_STARTED.name() : null);
    }
}
