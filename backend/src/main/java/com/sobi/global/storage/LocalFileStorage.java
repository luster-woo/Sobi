package com.sobi.global.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.FileSystemUtils;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

/**
 * 업로드 파일을 서버 디스크에 저장한다 (S3 미사용).
 *
 * DB 에는 루트 기준 상대경로만 저장한다. 로컬과 EC2 의 루트가 달라도 같은 값이 유효하다.
 *   application/{applicationId}/{applicationDocumentId}_{uuid}.{ext}
 * 파일명은 UUID 로 새로 만들므로 사용자가 보낸 이름의 ../ 같은 경로 조작이 끼어들 수 없다.
 */
@Slf4j
@Component
@EnableConfigurationProperties(FileStorageProperties.class)
public class LocalFileStorage {

    private static final String APPLICATION_DIR = "application";

    private final Path root;

    public LocalFileStorage(FileStorageProperties properties) {
        this.root = Path.of(properties.getUploadDir()).toAbsolutePath().normalize();
    }

    /** 신청 서류 파일을 저장하고 상대경로를 돌려준다. */
    public String saveApplicationDocument(Long applicationId, Long applicationDocumentId, String extension, byte[] content) {
        String relative = APPLICATION_DIR + "/" + applicationId + "/"
                + applicationDocumentId + "_" + UUID.randomUUID() + "." + extension;
        Path target = resolve(relative);
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, content);
            return relative;
        } catch (IOException e) {
            throw new UncheckedIOException("파일 저장 실패: " + relative, e);
        }
    }

    public byte[] read(String relativePath) throws IOException {
        return Files.readAllBytes(resolve(relativePath));
    }

    /** 파일 하나를 지운다. 이미 없으면 무시한다. 실패해도 요청을 깨뜨리지 않고 로그만 남긴다. */
    public void deleteQuietly(String relativePath) {
        if (relativePath == null) {
            return;
        }
        try {
            Files.deleteIfExists(resolve(relativePath));
        } catch (IOException | RuntimeException e) {
            log.warn("파일 삭제 실패: {}", relativePath, e);
        }
    }

    /** 신청 하나의 파일 폴더를 통째로 지운다 (신청 취소). */
    public void deleteApplicationQuietly(Long applicationId) {
        try {
            FileSystemUtils.deleteRecursively(resolve(APPLICATION_DIR + "/" + applicationId));
        } catch (IOException | RuntimeException e) {
            log.warn("신청 파일 폴더 삭제 실패: applicationId={}", applicationId, e);
        }
    }

    // DB 값이 오염돼도 루트 밖을 건드리지 않도록 막는다
    private Path resolve(String relativePath) {
        Path path = root.resolve(relativePath).normalize();
        if (!path.startsWith(root)) {
            throw new IllegalArgumentException("업로드 루트 밖의 경로: " + relativePath);
        }
        return path;
    }
}
