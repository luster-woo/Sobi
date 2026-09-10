package com.sobi.repayment.clientDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.sobi.global.external.ssafy.header.SsafyRequestHeader;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SsafyInquireLoanAccountListRequest {

    @JsonProperty("Header")
    private SsafyRequestHeader header;
}
