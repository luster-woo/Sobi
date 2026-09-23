package com.sobi.application.service;

import com.sobi.application.entity.ApplicationDocument;
import com.sobi.application.entity.ValidationStatus;
import com.sobi.application.repository.ApplicationDocumentRepository;
import com.sobi.business.entity.BusinessInfo;
import com.sobi.business.repository.BusinessReporitory;
import com.sobi.global.config.AsyncConfig;
import com.sobi.global.external.ai.client.OcrCallException;
import com.sobi.global.external.ai.client.OcrClient;
import com.sobi.global.external.ai.clientDto.OcrExpected;
import com.sobi.global.external.ai.clientDto.OcrVerifyResponse;
import com.sobi.global.storage.LocalFileStorage;
import com.sobi.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * 업로드된 제출 서류를 AI OCR 로 검증하고 결과를 저장한다.
 *
 *   PENDING ─(시작)→ VALIDATING ─(AI 응답)→ PASSED / FAILED
 *
 * 업로드 트랜잭션이 커밋된 뒤 별도 스레드에서 돈다. 커밋 전에 돌면 아직 저장되지 않은 행을 읽는다.
 * AI 호출 중에는 트랜잭션을 잡지 않는다 (최대 5분 대기 동안 DB 커넥션을 붙잡지 않도록).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DocumentValidationProcessor {

    private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");

    // 계약서 '백엔드 처리' 표의 문구
    static final String MESSAGE_FILE_REJECTED = "파일을 확인할 수 없습니다. 다른 파일로 다시 올려주세요.";
    static final String MESSAGE_ERROR = "검증 중 오류가 발생했습니다. 다시 업로드해 주세요.";

    private static final int MESSAGE_MAX_LENGTH = 255;          // application_document.validation_message
    private static final String UNKNOWN_DOCUMENT_NAME = "알 수 없는 서류";

    private final ApplicationDocumentRepository applicationDocumentRepository;
    private final BusinessReporitory businessReporitory;
    private final LocalFileStorage fileStorage;
    private final OcrClient ocrClient;

    @Async(AsyncConfig.DOCUMENT_VALIDATION_EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onDocumentUploaded(DocumentUploadedEvent event) {
        validate(event);
    }

    void validate(DocumentUploadedEvent event) {
        Long id = event.applicationDocumentId();
        String storedPath = event.storedPath();

        // 그 사이 재업로드됐거나 시간 초과로 정리됐으면 바뀌는 행이 없다 → 이 작업은 할 일이 없다
        if (applicationDocumentRepository.transitionValidation(id, storedPath,
                ValidationStatus.PENDING.name(), ValidationStatus.VALIDATING.name(), null, now()) == 0) {
            log.info("서류 검증 건너뜀 - 대기 상태가 아님 (id={})", id);
            return;
        }

        Result result = verify(event);

        // 검증 도중 재업로드(경로 변경)나 시간 초과(FAILED)가 먼저 일어났으면 이 결과는 버린다
        int updated = applicationDocumentRepository.transitionValidation(id, storedPath,
                ValidationStatus.VALIDATING.name(), result.status().name(), result.message(), now());

        if (updated == 0) {
            log.info("서류 검증 결과 폐기 - 그 사이 파일이 바뀌었거나 시간 초과 처리됨 (id={})", id);
        } else {
            log.info("서류 검증 완료 (id={}, status={})", id, result.status());
        }
    }

    // AI 결과를 저장할 상태·문구로 바꾼다. 어떤 실패든 사용자가 다시 올릴 수 있도록 FAILED 로 끝낸다
    private Result verify(DocumentUploadedEvent event) {
        try {
            OcrVerifyResponse response = requestVerification(event);

            if (OcrVerifyResponse.PASSED.equals(response.getStatus())) {
                return new Result(ValidationStatus.PASSED, null);
            }
            if (OcrVerifyResponse.FAILED.equals(response.getStatus())) {
                return new Result(ValidationStatus.FAILED, truncate(
                        response.getMessage() == null ? MESSAGE_ERROR : response.getMessage()));
            }
            log.error("OCR 응답 status 를 알 수 없음: {} (id={})", response.getStatus(), event.applicationDocumentId());
            return new Result(ValidationStatus.FAILED, MESSAGE_ERROR);

        } catch (OcrCallException e) {
            return new Result(ValidationStatus.FAILED, e.isFileRejected() ? MESSAGE_FILE_REJECTED : MESSAGE_ERROR);

        } catch (IOException | RuntimeException e) {
            log.error("서류 검증 중 오류 (id={})", event.applicationDocumentId(), e);
            return new Result(ValidationStatus.FAILED, MESSAGE_ERROR);
        }
    }

    private OcrVerifyResponse requestVerification(DocumentUploadedEvent event) throws IOException {
        ApplicationDocument document = applicationDocumentRepository
                .findWithApplicationAndRequiredDocumentById(event.applicationDocumentId())
                // 검증 도중 신청이 취소되면 행이 없다. 결과 저장도 0건이라 자연히 버려진다
                .orElseThrow(() -> new IllegalStateException("서류 행이 없습니다: " + event.applicationDocumentId()));

        byte[] content = fileStorage.read(event.storedPath());

        return ocrClient.verify(content, event.extension(), documentNameOf(document),
                expectedOf(document.getApplication().getUser()));
    }

    // AI 는 서류명으로 검증 기준을 고른다. DB 의 doc_name 을 그대로 넘긴다 (계약서 '서류별 기준')
    private String documentNameOf(ApplicationDocument document) {
        if (document.getLoanDocument() != null) {
            return document.getLoanDocument().getDocName();
        }
        if (document.getProgramDocument() != null && document.getProgramDocument().getDocName() != null) {
            return document.getProgramDocument().getDocName();
        }
        return UNKNOWN_DOCUMENT_NAME;
    }

    // 예비창업자처럼 사업자 정보가 없으면 사업자 항목은 null → AI 가 대조를 건너뛴다
    private OcrExpected expectedOf(User user) {
        BusinessInfo business = businessReporitory.findByUserId(user.getId());
        OcrExpected.OcrExpectedBuilder expected = OcrExpected.builder()
                .ownerName(user.getName())
                .birthDate(user.getBirthDate());
        if (business != null) {
            expected.brn(business.getBrn())
                    .businessName(business.getBusinessName())
                    .address(business.getAddress())
                    .region(business.getRegion())
                    .openDate(business.getOpenDate());
        }
        return expected.build();
    }

    private static String truncate(String message) {
        return message.length() > MESSAGE_MAX_LENGTH ? message.substring(0, MESSAGE_MAX_LENGTH) : message;
    }

    private static LocalDateTime now() {
        return LocalDateTime.now(KOREA_ZONE);
    }

    private record Result(ValidationStatus status, String message) {
    }
}
