package com.sobi.repayment.clientDto;

import com.fasterxml.jackson.annotation.JsonProperty;

import com.sobi.global.external.ssafy.client.SsafyFinanceResponse;
import com.sobi.global.external.ssafy.header.SsafyResponseHeader;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
public class SsafyInquireLoanAccountListResponse implements SsafyFinanceResponse {

    @JsonProperty("Header")
    private SsafyResponseHeader header;

    @JsonProperty("REC")
    List<SsafyInquireLoanAccountDetail> details;
}
