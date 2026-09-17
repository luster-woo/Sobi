package com.sobi.support.dto;

import java.util.Arrays;

/**
 * 지원사업 종류. DB 는 한글로 저장돼 있고 화면은 영문 코드를 쓴다.
 */
public enum SupportProgramType {

    SUPPORT("지원금"),
    LOAN("대출"),
    ETC("기타");

    private final String dbValue;

    SupportProgramType(String dbValue) {
        this.dbValue = dbValue;
    }

    public String getDbValue() {
        return dbValue;
    }

    /** 알 수 없는 값은 ETC 로 둔다. 금액·금리가 없는 유형이라 화면이 깨지지 않는다 */
    public static SupportProgramType from(String dbValue) {
        return Arrays.stream(values())
                .filter(type -> type.dbValue.equals(dbValue))
                .findFirst()
                .orElse(ETC);
    }
}