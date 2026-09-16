package com.sobi.loan.clientDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.sobi.global.external.ssafy.header.SsafyRequestHeader;
import lombok.Builder;
import lombok.Getter;

// 2.7.5 대출심사 신청 요청
@Getter
@Builder
public class SsafyCreateLoanApplicationRequest {

    @JsonProperty("Header")
    private SsafyRequestHeader header;

    private String accountTypeUniqueNo;
}
