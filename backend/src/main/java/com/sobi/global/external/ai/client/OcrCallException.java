package com.sobi.global.external.ai.client;

import lombok.Getter;

/**
 * OCR 검증이 판정까지 가지 못한 경우. (검증 실패는 예외가 아니라 status=FAILED 응답이다)
 */
@Getter
public class OcrCallException extends RuntimeException {

    /** AI 가 파일 자체를 거부했는지 (400 형식·손상 / 413 용량). 아니면 422·5xx·연결 실패·타임아웃 */
    private final boolean fileRejected;

    public OcrCallException(String message, boolean fileRejected, Throwable cause) {
        super(message, cause);
        this.fileRejected = fileRejected;
    }
}
