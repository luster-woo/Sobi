package com.sobi.loan.clientDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.sobi.global.external.ssafy.client.SsafyFinanceResponse;
import com.sobi.global.external.ssafy.header.SsafyResponseHeader;
import lombok.Getter;
import lombok.NoArgsConstructor;

// 2.7.7 대출 상품 가입 응답
@Getter
@NoArgsConstructor
public class SsafyCreateLoanAccountResponse implements SsafyFinanceResponse {

    @JsonProperty("REC")
    private SsafyLoanAccount account;

    @JsonProperty("Header")
    private SsafyResponseHeader header;
}
