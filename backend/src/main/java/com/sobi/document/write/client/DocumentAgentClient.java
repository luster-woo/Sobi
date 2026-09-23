package com.sobi.document.write.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sobi.document.write.clientDto.DraftCreateRequest;
import com.sobi.document.write.clientDto.DraftCreateResponse;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.io.IOException;
import java.util.UUID;

@Slf4j
@Component
public class DocumentAgentClient {
    public static final String HWPX_CONTENT_TYPE = "application/hwp+zip";
    private static final MediaType HWPX = MediaType.parseMediaType(HWPX_CONTENT_TYPE);
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public DocumentAgentClient(@Qualifier("documentAgentRestClient") RestClient restClient,
                               ObjectMapper objectMapper) {
        this.restClient = restClient;
        this.objectMapper = objectMapper;
    }

    public DraftCreateResponse createDraft(DraftCreateRequest request) {
        try {
            DraftCreateResponse response = restClient.post()
                    .uri("/api/v1/document-agent/drafts")
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(DraftCreateResponse.class);
            if (response == null || !"COMPLETED".equals(response.getStatus())
                    || !request.getTemplateId().equals(response.getTemplateId())
                    || response.getProgramDocumentId() == null || response.getProgramDocumentId() <= 0
                    || response.getWrittenFieldCount() < 0 || response.getLeftBlankFieldCount() < 0
                    || response.getUnsupportedFieldCount() < 0) {
                throw failed();
            }
            UUID id = validId(response.getDraftId());
            if (!("draft-" + id + ".hwpx").equals(response.getFileName())) {
                throw failed(); // 경로/CRLF/임의 확장자가 Content-Disposition에 들어가지 않도록 제한.
            }
            return response;
        } catch (RestClientResponseException e) {
            throw mapFailure(e, false);
        } catch (RestClientException e) {
            log.warn("Document Agent create failed: connection or response error");
            throw failed();
        }
    }

    public byte[] downloadDraft(String draftId) {
        UUID id = validId(draftId);
        try {
            ResponseEntity<byte[]> response = restClient.get()
                    .uri("/api/v1/document-agent/drafts/{draftId}/file", id)
                    .accept(HWPX)
                    .retrieve()
                    .toEntity(byte[].class);
            byte[] content = response.getBody();
            MediaType contentType = response.getHeaders().getContentType();
            if (content == null || content.length == 0 || contentType == null
                    || !HWPX.getType().equals(contentType.getType())
                    || !HWPX.getSubtype().equals(contentType.getSubtype())) {
                throw failed();
            }
            return content;
        } catch (RestClientResponseException e) {
            throw mapFailure(e, true);
        } catch (RestClientException | InvalidMediaTypeException e) {
            log.warn("Document Agent download failed: connection or response error");
            throw failed();
        }
    }

    private UUID validId(String value) {
        try {
            UUID id = UUID.fromString(value);
            if (!id.toString().equals(value)) {
                throw failed();
            }
            return id;
        } catch (IllegalArgumentException | NullPointerException e) {
            throw failed();
        }
    }

    private BusinessException mapFailure(RestClientResponseException exception, boolean download) {
        int status = exception.getStatusCode().value();
        // 원문 error body에는 경로/필드 값이 포함될 수 있다. 로그와 cause에 남기지 않는다.
        log.warn("Document Agent request failed: stage={}, httpStatus={}", download ? "download" : "create", status);
        if (status == 404) {
            return new BusinessException(download ? ErrorCode.DOCUMENT_DRAFT_FILE_NOT_FOUND
                    : ErrorCode.DOCUMENT_TEMPLATE_NOT_FOUND);
        }
        String code = errorCode(exception);
        if (status == 409 && ("DRAFT_NOT_READY".equals(code) || "TEMPLATE_NOT_READY".equals(code))) {
            return new BusinessException(ErrorCode.DOCUMENT_DRAFT_NOT_READY);
        }
        if (status == 409 && "DOCUMENT_NOT_WRITABLE".equals(code)) {
            return new BusinessException(ErrorCode.DOCUMENT_NOT_WRITABLE);
        }
        return failed();
    }

    private String errorCode(RestClientResponseException exception) {
        try {
            var body = objectMapper.readTree(exception.getResponseBodyAsByteArray());
            return body == null ? "" : body.path("detail").path("code").asText("");
        } catch (IOException e) {
            return "";
        }
    }

    private BusinessException failed() {
        return new BusinessException(ErrorCode.DOCUMENT_AGENT_REQUEST_FAILED);
    }
}
