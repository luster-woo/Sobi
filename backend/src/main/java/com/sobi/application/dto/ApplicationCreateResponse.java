package com.sobi.application.dto;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

// 신청 생성 결과. 
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ApplicationCreateResponse {

    private final Long applicationId;

    public static ApplicationCreateResponse from(Long applicationId) {
        return new ApplicationCreateResponse(applicationId);
    }
}
