package com.sobi.loan.clientDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.sobi.global.external.ssafy.client.SsafyFinanceResponse;
import com.sobi.global.external.ssafy.header.SsafyResponseHeader;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

// 2.7.3 대출 상품 조회 응답
@Getter
@NoArgsConstructor
public class SsafyInquireLoanProductListResponse implements SsafyFinanceResponse {

    @JsonProperty("Header")
    private SsafyResponseHeader header;

    @JsonProperty("REC")
    private List<SsafyLoanProduct> products;
}
