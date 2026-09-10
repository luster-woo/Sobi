package com.sobi.repayment.clientDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.sobi.global.external.ssafy.client.SsafyFinanceResponse;
import com.sobi.global.external.ssafy.header.SsafyResponseHeader;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SsafyUpdateRepaymentLoanBalanceInFullResponse implements SsafyFinanceResponse {

    @JsonProperty("Header")
    private SsafyResponseHeader header;

    @JsonProperty("REC")
    private SsafyFullRepaymentRecord rec;
}
