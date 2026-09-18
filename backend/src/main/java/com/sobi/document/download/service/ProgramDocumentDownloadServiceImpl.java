package com.sobi.document.download.service;

import com.sobi.document.download.dto.DocumentDownload;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import com.sobi.support.entity.ProgramDocument;
import com.sobi.support.repository.ProgramDocumentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.UrlResource;
import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Map;

@Service
public class ProgramDocumentDownloadServiceImpl implements ProgramDocumentDownloadService {
    private static final Map<String, String> MIME_TYPES = Map.of(
            "pdf", "application/pdf",
            "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "hwp", "application/x-hwp",
            "hwpx", "application/vnd.hancom.hwpx"
    );

    private final ProgramDocumentRepository repository;
    private final Path basePath;

    public ProgramDocumentDownloadServiceImpl(ProgramDocumentRepository repository,
            @Value("${document.storage.original-dir}") String originalDir) {
        this.repository = repository;
        if (originalDir == null || originalDir.isBlank()) {
            throw new IllegalArgumentException("document.storage.original-dir must not be blank");
        }
        this.basePath = Path.of(originalDir).toAbsolutePath().normalize();
    }

    @Override
    public DocumentDownload download(Long programDocumentId) {
        if (programDocumentId == null || programDocumentId <= 0) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
        }
        ProgramDocument document = repository.findById(programDocumentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PROGRAM_DOCUMENT_NOT_FOUND));
        try {
            // 원본 저장 규칙: {original-dir}/{programDocumentId}/ 안에 파일 하나.
            // DB url은 사용하지 않으며 하위 폴더를 재귀 탐색하지 않는다.
            Path directory = basePath.resolve(programDocumentId.toString()).normalize();
            if (!directory.startsWith(basePath) || Files.isSymbolicLink(directory)) {
                throw new BusinessException(ErrorCode.INVALID_DOCUMENT_PATH);
            }
            Path realBase = basePath.toRealPath();
            Path realDirectory = directory.toRealPath();
            if (!realDirectory.startsWith(realBase)) {
                throw new BusinessException(ErrorCode.INVALID_DOCUMENT_PATH);
            }
            if (!Files.isDirectory(realDirectory)) {
                throw new BusinessException(ErrorCode.DOCUMENT_FILE_NOT_FOUND);
            }
            Path target = singleFile(realDirectory);
            Path realFile = target.toRealPath();
            if (!realFile.startsWith(realDirectory)) {
                throw new BusinessException(ErrorCode.INVALID_DOCUMENT_PATH);
            }
            if (!Files.isRegularFile(realFile)) {
                throw new BusinessException(ErrorCode.DOCUMENT_FILE_NOT_FOUND);
            }
            UrlResource resource = new UrlResource(realFile.toUri());
            // 응답이 시작되기 전에 접근 권한/Resource 열기 실패를 기존 JSON 오류로 변환한다.
            try (var ignored = resource.getInputStream()) {
                return new DocumentDownload(resource, downloadName(document.getDocName(), target),
                        mediaType(target), Files.size(realFile));
            }
        } catch (InvalidPathException e) {
            throw new BusinessException(ErrorCode.INVALID_DOCUMENT_PATH);
        } catch (NoSuchFileException e) {
            throw new BusinessException(ErrorCode.DOCUMENT_FILE_NOT_FOUND);
        } catch (IOException | UncheckedIOException | SecurityException e) {
            throw new BusinessException(ErrorCode.DOCUMENT_FILE_READ_FAILED);
        }
    }

    private Path singleFile(Path directory) throws IOException {
        Path selected = null;
        try (var entries = Files.list(directory)) {
            var iterator = entries.iterator();
            while (iterator.hasNext()) {
                Path entry = iterator.next();
                if (Files.isSymbolicLink(entry)) {
                    throw new BusinessException(ErrorCode.INVALID_DOCUMENT_PATH);
                }
                if (Files.isRegularFile(entry)) {
                    if (selected != null) {
                        // 복수 파일은 저장 규칙 위반이다. 임의의 파일을 선택하지 않는다.
                        throw new BusinessException(ErrorCode.DOCUMENT_FILE_READ_FAILED);
                    }
                    selected = entry;
                }
            }
        }
        if (selected == null) {
            throw new BusinessException(ErrorCode.DOCUMENT_FILE_NOT_FOUND);
        }
        return selected;
    }

    private String downloadName(String docName, Path path) {
        String storedName = path.getFileName().toString();
        String name = docName == null || docName.isBlank() ? storedName : docName.strip();
        // 표시명은 경로가 아니다. CR/LF 등 제어 문자와 경로 구분자를 제거한다.
        name = name.replaceAll("[\\p{Cntrl}/\\\\]", "_");
        if (name.equals(".") || name.equals("..")) {
            name = storedName;
        }
        String extension = extension(path);
        if (!extension.isEmpty() && !name.toLowerCase(Locale.ROOT).endsWith("." + extension)) {
            name += "." + extension;
        }
        return name;
    }

    private String extension(Path path) {
        String name = path.getFileName().toString();
        int dot = name.lastIndexOf('.');
        return dot < 0 ? "" : name.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private MediaType mediaType(Path path) {
        String fallback = MIME_TYPES.getOrDefault(extension(path), MediaType.APPLICATION_OCTET_STREAM_VALUE);
        try {
            String detected = Files.probeContentType(path);
            // ZIP 기반 Office 문서를 일반 ZIP으로 인식하는 OS에서는 확장자 fallback 사용.
            if (detected != null && !detected.equals("application/zip")
                    && !detected.equals("application/x-zip-compressed")
                    && !detected.equals(MediaType.APPLICATION_OCTET_STREAM_VALUE)) {
                MediaType type = MediaType.parseMediaType(detected);
                if (type.isConcrete()) {
                    return type;
                }
            }
        } catch (IOException | InvalidMediaTypeException e) {
            // OS의 MIME 감지 실패는 파일 다운로드를 실패시키지 않는다.
        }
        return MediaType.parseMediaType(fallback);
    }
}
