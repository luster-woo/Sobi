package com.sobi.global.external.ai.clientDto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * POST /ocr/verify 응답 중 백엔드가 쓰는 값만 받는다.
 * checks · extracted 는 디버깅·시연용이라 저장하지 않는다 (계약서 '응답').
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class OcrVerifyResponse {

    public static final String PASSED = "PASSED";
    public static final String FAILED = "FAILED";

    /** PASSED | FAILED */
    private String status;

    /** 사용자에게 보여줄 실패 사유 한 문장. PASSED 면 null */
    private String message;

    /** OCR 평균 신뢰도 0~1 */
    private Double confidence;

    private Long elapsedMs;
}
