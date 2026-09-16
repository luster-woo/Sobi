package com.sobi.loan.clientDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.sobi.global.external.ssafy.client.SsafyFinanceResponse;
import com.sobi.global.external.ssafy.header.SsafyResponseHeader;
import lombok.Getter;
import lombok.NoArgsConstructor;

// 2.7.5 대출심사 신청 응답 - 신청 즉시 승인/거절이 결정된다
@Getter
@NoArgsConstructor
public class SsafyCreateLoanApplicationResponse implements SsafyFinanceResponse {

    @JsonProperty("Header")
    private SsafyResponseHeader header;

    @JsonProperty("REC")
    private SsafyLoanApplication application;
}
