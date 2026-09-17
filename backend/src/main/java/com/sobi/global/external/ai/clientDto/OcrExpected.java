package com.sobi.global.external.ai.clientDto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

/**
 * POST /ocr/verify 의 expected. 서류에서 읽은 값과 대조할 정답값이다.
 * AI 서버는 DB 를 보지 않으므로 백엔드가 채워 보낸다. null 인 항목은 대조하지 않는다.
 * 계약: ai/docs/05_ocr_contract.md
 */
@Getter
@Builder
@JsonInclude(JsonInclude.Include.ALWAYS)
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class OcrExpected {

    private final String brn;           // business_info.brn
    private final String ownerName;     // users.name
    private final String businessName;  // business_info.business_name
    private final String address;       // business_info.address
    private final String region;        // business_info.region (시도 표준 표기)
    private final LocalDate openDate;   // business_info.open_date
}
