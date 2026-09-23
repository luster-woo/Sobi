package com.sobi.document.download.service;

import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import com.sobi.support.entity.ProgramDocument;
import com.sobi.support.repository.ProgramDocumentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.mockito.Mockito.*;

class ProgramDocumentDownloadServiceTest {
    @TempDir Path temp;
    private ProgramDocumentRepository repository;
    private ProgramDocument document;
    private ProgramDocumentDownloadServiceImpl service;
    private Path root;

    @BeforeEach
    void setUp() throws IOException {
        root = Files.createDirectory(temp.resolve("original"));
        repository = mock(ProgramDocumentRepository.class);
        document = mock(ProgramDocument.class);
        when(repository.findById(12L)).thenReturn(Optional.of(document));
        service = new ProgramDocumentDownloadServiceImpl(repository, root.toString());
    }

    private Path file(String relative) throws IOException {
        Path file = root.resolve("12").resolve(relative);
        Files.createDirectories(file.getParent());
        Files.write(file, new byte[]{80, 75, 3, 4});
        return file;
    }

    private void assertError(ErrorCode code) {
        assertThatThrownBy(() -> service.download(12L)).isInstanceOfSatisfying(
                BusinessException.class, e -> assertThat(e.getErrorCode()).isEqualTo(code));
    }

    @Test
    void idDirectoryWithNullUrlUsesKoreanNameAndPreservesOriginal() throws Exception {
        Path path = file("business-plan.hwpx");
        byte[] before = Files.readAllBytes(path);
        when(document.getDocName()).thenReturn("사업계획서");
        var result = service.download(12L);
        assertThat(result.getFileName()).isEqualTo("사업계획서.hwpx");
        assertThat(result.getContentLength()).isEqualTo(4);
        try (var stream = result.getResource().getInputStream()) {
            assertThat(stream.readAllBytes()).isEqualTo(before);
        }
        assertThat(Files.readAllBytes(path)).isEqualTo(before);
        verify(document, never()).getUrl();
    }

    @Test
    void missingDisplayNameFallsBackToStoredFilename() throws Exception {
        file("신청서.pdf");
        assertThat(service.download(12L).getFileName()).isEqualTo("신청서.pdf");
    }

    @Test
    void displayNameCannotInjectHeadersOrPaths() throws Exception {
        file("form.pdf");
        when(document.getDocName()).thenReturn("folder/신청서\r\n.pdf");
        assertThat(service.download(12L).getFileName()).isEqualTo("folder_신청서__.pdf");
    }

    @Test
    void missingDocumentUsesExistingError() {
        when(repository.findById(12L)).thenReturn(Optional.empty());
        assertError(ErrorCode.PROGRAM_DOCUMENT_NOT_FOUND);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = " ")
    void urlIsNotRequired(String value) throws Exception {
        file("form.pdf");
        when(document.getUrl()).thenReturn(value);
        assertThat(service.download(12L).getContentLength()).isEqualTo(4);
        verify(document, never()).getUrl();
    }

    @ParameterizedTest
    @ValueSource(strings = {"../outside.pdf", "../../outside.pdf", "/etc/passwd",
            "C:/outside.pdf", "..\\outside.pdf", "https://example.com/form.pdf", "bad\u0000.pdf"})
    void legacyUrlIsIgnored(String value) throws Exception {
        file("form.pdf");
        when(document.getUrl()).thenReturn(value);
        assertThat(service.download(12L).getContentLength()).isEqualTo(4);
        verify(document, never()).getUrl();
    }

    @Test
    void multipleFilesAreRejectedRatherThanSelectingFirst() throws Exception {
        file("form.pdf");
        file("second.hwpx");
        assertError(ErrorCode.DOCUMENT_FILE_READ_FAILED);
    }

    @Test
    void absentDirectory() {
        assertError(ErrorCode.DOCUMENT_FILE_NOT_FOUND);
    }

    @Test
    void emptyDirectory() throws Exception {
        Files.createDirectory(root.resolve("12"));
        assertError(ErrorCode.DOCUMENT_FILE_NOT_FOUND);
    }

    @Test
    void idPathMustBeDirectory() throws Exception {
        Files.writeString(root.resolve("12"), "not a directory");
        assertError(ErrorCode.DOCUMENT_FILE_NOT_FOUND);
    }

    @Test
    void nestedFilesAreNotSearchedRecursively() throws Exception {
        file("nested/form.pdf");
        assertError(ErrorCode.DOCUMENT_FILE_NOT_FOUND);
    }

    @Test
    void anotherDocumentsFileIsNotSelected() throws Exception {
        Files.createDirectory(root.resolve("12"));
        Files.createDirectory(root.resolve("13"));
        Files.writeString(root.resolve("13/form.pdf"), "other document");
        assertError(ErrorCode.DOCUMENT_FILE_NOT_FOUND);
    }

    @Test
    void symlinkOutsideRootIsRejected() throws Exception {
        Path outside = Files.writeString(temp.resolve("outside.pdf"), "private");
        Files.createDirectory(root.resolve("12"));
        try {
            Files.createSymbolicLink(root.resolve("12/link.pdf"), outside);
        } catch (IOException | UnsupportedOperationException | SecurityException e) {
            assumeTrue(false, "OS does not permit symbolic link creation");
        }
        assertError(ErrorCode.INVALID_DOCUMENT_PATH);
    }

    @Test
    void symlinkDocumentDirectoryIsRejected() throws Exception {
        Path outside = Files.createDirectory(temp.resolve("outside"));
        Files.writeString(outside.resolve("form.pdf"), "private");
        try {
            Files.createSymbolicLink(root.resolve("12"), outside);
        } catch (IOException | UnsupportedOperationException | SecurityException e) {
            assumeTrue(false, "OS does not permit symbolic link creation");
        }
        assertError(ErrorCode.INVALID_DOCUMENT_PATH);
    }

    @Test
    void directoryListingFailureUsesSafeBusinessError() throws Exception {
        Path directory = Files.createDirectory(root.resolve("12")).toRealPath();
        try (var files = mockStatic(Files.class, CALLS_REAL_METHODS)) {
            files.when(() -> Files.list(directory)).thenThrow(new IOException("private path"));
            assertError(ErrorCode.DOCUMENT_FILE_READ_FAILED);
        }
    }

    @ParameterizedTest
    @CsvSource({"PDF,application/pdf", "docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "hwp,application/x-hwp", "hwpx,application/vnd.hancom.hwpx", "unknown,application/octet-stream"})
    void missingMimeDetectionUsesExtension(String extension, String expected) throws Exception {
        Path path = file("form." + extension);
        try (var files = mockStatic(Files.class, CALLS_REAL_METHODS)) {
            files.when(() -> Files.probeContentType(path)).thenReturn(null);
            assertThat(service.download(12L).getMediaType().toString()).isEqualTo(expected);
        }
    }

    @Test
    void genericZipDetectionFallsBackToHwpx() throws Exception {
        Path path = file("form.hwpx");
        try (var files = mockStatic(Files.class, CALLS_REAL_METHODS)) {
            files.when(() -> Files.probeContentType(path)).thenReturn("application/zip");
            assertThat(service.download(12L).getMediaType().toString()).isEqualTo("application/vnd.hancom.hwpx");
        }
    }

    @Test
    void probeFailureFallsBackToExtension() throws Exception {
        Path path = file("form.pdf");
        try (var files = mockStatic(Files.class, CALLS_REAL_METHODS)) {
            files.when(() -> Files.probeContentType(path)).thenThrow(new IOException("private path"));
            assertThat(service.download(12L).getMediaType().toString()).isEqualTo("application/pdf");
        }
    }

    @Test
    void resourceOpenFailureUsesSafeBusinessError() throws Exception {
        file("form.pdf");
        try (var resources = mockConstruction(org.springframework.core.io.UrlResource.class,
                (resource, context) -> when(resource.getInputStream()).thenThrow(new IOException("private path")))) {
            assertError(ErrorCode.DOCUMENT_FILE_READ_FAILED);
        }
    }
}
