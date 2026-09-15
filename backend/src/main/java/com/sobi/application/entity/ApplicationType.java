package com.sobi.application.entity;

import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;

import java.util.Arrays;

// 신청 종류. 쿼리 파라미터를 enum 으로 직접 받으면 잘못된 값이 500 으로 떨어져서 from() 으로 변환
public enum ApplicationType {
    LOAN,
    SUPPORT;

    public static ApplicationType from(String value) {
        return Arrays.stream(values())
                .filter(type -> type.name().equalsIgnoreCase(value))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.APPLICATION_TYPE_BAD_REQUEST));
    }
}
