package com.sobi.document.download.controller;

import com.sobi.document.download.dto.DocumentDownload;
import com.sobi.document.download.service.ProgramDocumentDownloadService;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/v1/program-documents")
@RequiredArgsConstructor
public class ProgramDocumentDownloadController {
    private final ProgramDocumentDownloadService service;

    @GetMapping("/{programDocumentId}/download")
    public ResponseEntity<Resource> download(@PathVariable @Positive Long programDocumentId) {
        DocumentDownload download = service.download(programDocumentId);
        return ResponseEntity.ok()
                .contentType(download.getMediaType())
                .contentLength(download.getContentLength())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(download.getFileName(), StandardCharsets.UTF_8).build().toString())
                .header(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, HttpHeaders.CONTENT_DISPOSITION)
                .body(download.getResource());
    }
}
