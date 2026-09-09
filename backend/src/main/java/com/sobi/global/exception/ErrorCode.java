package com.sobi.global.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {


    NO_USER(HttpStatus.NOT_FOUND, "U001", "존재하지 않는 사용자입니다."),

    // Common
    INVALID_INPUT_VALUE(HttpStatus.BAD_REQUEST, "COMMON_001", "입력값 중에 기준을 만족하지 않은 입력값이 있습니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "COMMON_002", "서버 내부 오류가 발생했습니다."),
    SPEECH_TRANSCRIPTION_FAILED(HttpStatus.BAD_REQUEST, "STT_001", "STT 변환 중 문제 발생"),

    // business 관련
    VERIFICATION_NOT_FOUND(HttpStatus.NOT_FOUND, "BUSINESS_001", "사업자 번호가 일치하는 사업자 정보를 찾을 수 없습니다."),
    BUSINESS_INFO_MISMATCH(HttpStatus.BAD_REQUEST, "BUSINESS_002", "입력한 사업자 정보와 실제 등록된 사업자 정보가 일치하지 않습니다."),
    BUSINESS_CODE_NOT_FOUND(HttpStatus.NOT_FOUND,"BUSINESS_003", "업종 코드가 존재하지 않습니다."),
    BUSINESS_INFO_NOT_FOUND(HttpStatus.NOT_FOUND, "BUSINESS_O04", "등록된 사업자 정보가 없습니다.");



    private final HttpStatus status;
    private final String code;
    private final String message;

    ErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }
}
