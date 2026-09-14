package com.sobi.loan.clientDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.sobi.global.external.ssafy.client.SsafyFinanceResponse;
import com.sobi.global.external.ssafy.header.SsafyResponseHeader;
import lombok.Getter;
import lombok.NoArgsConstructor;

// 2.7.2 대출 상품 등록 응답 - REC 에 발급된 accountTypeUniqueNo 가 담긴다
@Getter
@NoArgsConstructor
public class SsafyCreateLoanProductResponse implements SsafyFinanceResponse {

    @JsonProperty("Header")
    private SsafyResponseHeader header;

    @JsonProperty("REC")
    private SsafyLoanProduct product;
}
