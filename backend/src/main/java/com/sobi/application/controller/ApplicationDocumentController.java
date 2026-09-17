package com.sobi.application.controller;

import com.sobi.application.dto.ApplicationDocumentUploadResponse;
import com.sobi.application.service.ApplicationDocumentService;
import com.sobi.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/v1/document")
@RequiredArgsConstructor
public class ApplicationDocumentController {

    private final ApplicationDocumentService applicationDocumentService;

    /**
     * 신청 서류 업로드 (재업로드 포함).
     * 제출 서류는 PENDING 으로 바로 응답하고 AI 검증은 뒤에서 돈다 → 신청 상세를 폴링해 결과를 확인한다.
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ApplicationDocumentUploadResponse>> upload(
            @AuthenticationPrincipal Long userId,
            @RequestParam Long applicationDocumentId,
            // 파일이 빠진 요청도 서비스에서 같은 에러 형식(APPLICATION_015)으로 응답하도록 required=false
            @RequestParam(required = false) MultipartFile file,
            HttpServletRequest request
    ) {
        ApplicationDocumentUploadResponse response =
                applicationDocumentService.upload(userId, applicationDocumentId, file);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "서류 업로드에 성공하였습니다.",
                        response,
                        request
                ));
    }
}
