package com.sobi.loan.clientDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.sobi.global.external.ssafy.client.SsafyFinanceResponse;
import com.sobi.global.external.ssafy.header.SsafyResponseHeader;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

// 2.7.1 신용등급 기준 조회 응답 - A ~ E 5개 등급
@Getter
@NoArgsConstructor
public class SsafyInquireCreditRatingListResponse implements SsafyFinanceResponse {

    @JsonProperty("Header")
    private SsafyResponseHeader header;

    @JsonProperty("REC")
    private List<SsafyCreditRating> ratings;
}
