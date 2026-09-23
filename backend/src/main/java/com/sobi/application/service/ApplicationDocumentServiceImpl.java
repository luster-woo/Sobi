package com.sobi.application.service;

import com.sobi.application.dto.ApplicationDocumentUploadResponse;
import com.sobi.application.entity.Application;
import com.sobi.application.entity.ApplicationDocument;
import com.sobi.application.entity.ApplicationStatus;
import com.sobi.application.entity.DocumentType;
import com.sobi.application.repository.ApplicationDocumentRepository;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import com.sobi.global.storage.LocalFileStorage;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ApplicationDocumentServiceImpl implements ApplicationDocumentService {

    private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");

    static final long MAX_FILE_BYTES = 10L * 1024 * 1024;
    private static final int ORIGINAL_FILENAME_MAX_LENGTH = 255;

    private static final byte[] PDF_SIGNATURE = "%PDF".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] JPEG_SIGNATURE = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    // hwp·doc 는 OLE2 복합 문서, hwpx·docx 는 ZIP 컨테이너다
    private static final byte[] OLE2_SIGNATURE =
            {(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1};
    private static final byte[] ZIP_SIGNATURE = {'P', 'K', 0x03, 0x04};

    // 확장자 → 파일 앞부분 시그니처. 이름만 바꾼 파일을 걸러낸다.
    // 제출 서류는 OCR 로 검증하므로 AI 서버가 읽는 형식만 받는다. AI 서버와 같은 규칙 (ai/app/ocr/router.py)
    private static final Map<String, byte[]> SUBMIT_SIGNATURES = Map.of(
            "pdf", PDF_SIGNATURE,
            "png", new byte[]{(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'},
            "jpg", JPEG_SIGNATURE,
            "jpeg", JPEG_SIGNATURE
    );

    // 작성 서류는 검증 없이 보관만 한다. 초안을 한글·워드로 고친 파일을 그대로 받는다 (프론트 WRITE_ACCEPT 와 같은 목록)
    private static final Map<String, byte[]> WRITE_SIGNATURES = Map.of(
            "pdf", PDF_SIGNATURE,
            "hwp", OLE2_SIGNATURE,
            "doc", OLE2_SIGNATURE,
            "hwpx", ZIP_SIGNATURE,
            "docx", ZIP_SIGNATURE
    );

    private final ApplicationDocumentRepository applicationDocumentRepository;
    private final LocalFileStorage fileStorage;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * 서류 파일 업로드 (첫 업로드·재업로드 공통).
     * 파일을 저장하고 상태만 바꾼 뒤 바로 응답한다. 제출 서류의 AI 검증은 커밋 후 비동기로 시작된다.
     */
    @Override
    @Transactional
    public ApplicationDocumentUploadResponse upload(Long userId, Long applicationDocumentId, MultipartFile file) {

        // 인증 없이 호출되면 userId 가 null 이 되므로 NPE 대신 401 로 응답한다 (방어 코드)
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        // 남의 서류도 '없는 서류'로 응답해 존재 여부를 드러내지 않는다
        ApplicationDocument document = applicationDocumentRepository
                .findWithApplicationAndRequiredDocumentById(applicationDocumentId)
                .filter(found -> found.getApplication().getUser().getId().equals(userId))
                .orElseThrow(() -> new BusinessException(ErrorCode.APPLICATION_DOCUMENT_NOT_FOUND));

        Application application = document.getApplication();

        // 제출 이후에 서류를 바꾸면 심사·지급 기록과 어긋난다
        if (ApplicationStatus.valueOf(application.getStatus()) != ApplicationStatus.PREPARING) {
            throw new BusinessException(ErrorCode.APPLICATION_DOCUMENT_UPLOAD_NOT_ALLOWED);
        }

        if (document.isValidating()) {
            throw new BusinessException(ErrorCode.APPLICATION_DOCUMENT_VALIDATING);
        }

        DocumentType documentType = DocumentType.valueOf(document.getDocumentType());
        Map<String, byte[]> signatures = documentType == DocumentType.SUBMIT ? SUBMIT_SIGNATURES : WRITE_SIGNATURES;

        String extension = extensionOf(file, signatures);
        byte[] content = readValidatedContent(file, signatures.get(extension));

        String previousPath = document.getStoredPath();
        String storedPath = fileStorage.saveApplicationDocument(
                application.getId(), document.getId(), extension, content);

        // 파일은 트랜잭션 밖에 있다. 커밋되면 교체된 옛 파일을, 롤백되면 방금 저장한 파일을 지운다
        afterCompletion(committed -> fileStorage.deleteQuietly(committed ? previousPath : storedPath));

        document.upload(originalFilenameOf(file, extension), storedPath, LocalDateTime.now(KOREA_ZONE));

        // 작성 서류는 검증하지 않는다 (upload 에서 바로 PASSED)
        if (documentType == DocumentType.SUBMIT) {
            eventPublisher.publishEvent(new DocumentUploadedEvent(document.getId(), storedPath, extension));
        }

        return ApplicationDocumentUploadResponse.from(document);
    }

    private String extensionOf(MultipartFile file, Map<String, byte[]> signatures) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.APPLICATION_DOCUMENT_FILE_EMPTY);
        }
        String extension = StringUtils.getFilenameExtension(file.getOriginalFilename());
        if (extension == null || !signatures.containsKey(extension.toLowerCase(Locale.ROOT))) {
            throw new BusinessException(ErrorCode.APPLICATION_DOCUMENT_FILE_TYPE_INVALID);
        }
        return extension.toLowerCase(Locale.ROOT);
    }

    private byte[] readValidatedContent(MultipartFile file, byte[] signature) {
        // spring.servlet.multipart.max-file-size(20MB) 보다 엄격한 서류 한도. AI 계약서와 같은 10MB
        if (file.getSize() > MAX_FILE_BYTES) {
            throw new BusinessException(ErrorCode.APPLICATION_DOCUMENT_FILE_TOO_LARGE);
        }
        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException("업로드 파일 읽기 실패", e);
        }
        if (content.length < signature.length
                || !Arrays.equals(Arrays.copyOf(content, signature.length), signature)) {
            throw new BusinessException(ErrorCode.APPLICATION_DOCUMENT_FILE_TYPE_INVALID);
        }
        return content;
    }

    // 브라우저에 따라 경로가 붙어 오는 경우가 있어 파일명만 남기고, 컬럼 길이(255)에 맞춘다
    private String originalFilenameOf(MultipartFile file, String extension) {
        String name = StringUtils.getFilename(StringUtils.cleanPath(
                file.getOriginalFilename() == null ? "" : file.getOriginalFilename()));
        if (!StringUtils.hasText(name)) {
            return "document." + extension;
        }
        return name.length() > ORIGINAL_FILENAME_MAX_LENGTH
                ? name.substring(name.length() - ORIGINAL_FILENAME_MAX_LENGTH)
                : name;
    }

    // 트랜잭션이 끝난 뒤 실행한다. 트랜잭션 밖(단위 테스트 등)에서는 커밋된 것으로 보고 바로 실행한다
    private void afterCompletion(java.util.function.Consumer<Boolean> action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            action.accept(true);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                action.accept(status == STATUS_COMMITTED);
            }
        });
    }
}
