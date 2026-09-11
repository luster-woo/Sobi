package com.sobi.global.external.ssafy.client.member;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SsafyMemberResponse {

    private String userId;
    private String userName;
    private String institutionCode;
    private String userKey;
    private String created;
    private String modified;
}