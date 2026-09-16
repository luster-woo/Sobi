package com.sobi.user.clientDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.sobi.global.external.ssafy.client.SsafyFinanceResponse;
import com.sobi.global.external.ssafy.header.SsafyResponseHeader;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SsafyInquireMyCreditRatingResponse implements SsafyFinanceResponse {

    @JsonProperty("Header")
    private SsafyResponseHeader header;

    /** 계좌 목록과 달리 REC 가 배열이 아니라 객체 하나다. */
    @JsonProperty("REC")
    private SsafyMyCreditRating rec;
}