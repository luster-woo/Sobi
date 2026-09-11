package com.sobi.global.external.ssafy.client.member;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class SsafyMemberRequest {

    private String apiKey;
    private String userId;
}
