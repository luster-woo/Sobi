package com.sobi.loan.clientDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.sobi.global.external.ssafy.header.SsafyRequestHeader;
import lombok.Builder;
import lombok.Getter;

// 2.7.3 대출 상품 조회 요청 - Header 만 전송
@Getter
@Builder
public class SsafyInquireLoanProductListRequest {

    @JsonProperty("Header")
    private SsafyRequestHeader header;
}
