package com.sobi.global.external.ai.client;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sobi.global.external.ai.clientDto.OcrExpected;
import com.sobi.global.external.ai.clientDto.OcrVerifyResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.nio.charset.StandardCharsets;

@Slf4j
@Component
public class OcrClient {

    // 문자열 파트에 charset 을 명시하지 않으면 ISO-8859-1 로 나가 한글 서류명이 깨진다
    private static final MediaType TEXT_UTF8 = new MediaType(MediaType.TEXT_PLAIN, StandardCharsets.UTF_8);

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    // RagClient 와 같은 이유(@Qualifier + Lombok 생성자 문제)로 생성자를 직접 쓴다
    public OcrClient(
            @Qualifier("aiOcrRestClient") RestClient restClient,
            ObjectMapper objectMapper
    ) {
        this.restClient = restClient;
        this.objectMapper = objectMapper;
    }

    /**
     * POST /ocr/verify. 계약은 ai/docs/05_ocr_contract.md.
     * 서류 한 장에 10~25초, AI 서버에 앞선 요청이 쌓여 있으면 그만큼 더 걸린다.
     * 검증 실패는 예외가 아니라 status=FAILED 응답으로 온다.
     *
     * @param extension pdf / jpg / jpeg / png. AI 는 확장자와 파일 앞부분으로 형식을 판단한다
     * @throws OcrCallException 판정까지 가지 못한 경우
     */
    public OcrVerifyResponse verify(byte[] content, String extension, String documentName, OcrExpected expected) {
        MultipartBodyBuilder body = new MultipartBodyBuilder();
        // 원래 파일명은 AI 에 필요 없고, 한글 파일명은 Content-Disposition 인코딩 문제를 만든다
        body.part("file", new ByteArrayResource(content)).filename("document." + extension);
        body.part("document_name", documentName, TEXT_UTF8);
        body.part("expected", toJson(expected), TEXT_UTF8);

        try {
            OcrVerifyResponse response = restClient.post()
                    .uri("/ocr/verify")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body.build())
                    .retrieve()
                    .body(OcrVerifyResponse.class);

            if (response == null || response.getStatus() == null) {
                throw new OcrCallException("OCR 응답이 비어 있습니다.", false, null);
            }
            return response;

        } catch (RestClientResponseException e) {
            HttpStatus status = HttpStatus.resolve(e.getStatusCode().value());
            boolean fileRejected = status == HttpStatus.BAD_REQUEST || status == HttpStatus.PAYLOAD_TOO_LARGE;
            log.warn("OCR 호출 실패 - HTTP {} {}", e.getStatusCode().value(), e.getResponseBodyAsString());
            throw new OcrCallException("OCR 호출 실패 (HTTP " + e.getStatusCode().value() + ")", fileRejected, e);

        } catch (RestClientException e) {
            log.warn("OCR 호출 실패 - 연결·타임아웃", e);
            throw new OcrCallException("OCR 호출 실패 (연결·타임아웃)", false, e);
        }
    }

    private String toJson(OcrExpected expected) {
        try {
            return objectMapper.writeValueAsString(expected);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("expected 직렬화 실패", e);
        }
    }
}
