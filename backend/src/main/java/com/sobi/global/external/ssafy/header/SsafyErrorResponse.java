package com.sobi.global.external.ssafy.header;

import lombok.Getter;
import lombok.NoArgsConstructor;

// 금융망 4xx 응답 body: { "responseCode": "E4002", "responseMessage": "..." }
@Getter
@NoArgsConstructor
public class SsafyErrorResponse {

    private String responseCode;
    private String responseMessage;
}
