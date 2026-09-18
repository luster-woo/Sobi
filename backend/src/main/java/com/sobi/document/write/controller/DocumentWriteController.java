package com.sobi.document.write.controller;

import com.sobi.document.write.service.DocumentWriteService;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/document")
@RequiredArgsConstructor
public class DocumentWriteController {
    private final DocumentWriteService service;

    /** 문서 초안 생성 및 HWPX 다운로드. 성공 응답에는 ApiResponse를 사용하지 않는다. */
    @PostMapping("/write/{programDocumentId}")
    public ResponseEntity<byte[]> writeDocument(
            @AuthenticationPrincipal Long userId,
            @PathVariable @Positive Long programDocumentId
    ) {
        var result = service.writeDocument(userId, programDocumentId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(result.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(result.getFileName()).build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .header(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, "Content-Disposition")
                .body(result.getContent());
    }
}
