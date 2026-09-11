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

    // auth 관련
    MAIL_SEND_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "AUTH_001", "메일 발송에 실패했습니다."),
    EMAIL_SEND_COOLDOWN(HttpStatus.TOO_MANY_REQUESTS, "AUTH_002", "잠시 후 다시 시도해주세요."),
    EMAIL_CODE_EXPIRED(HttpStatus.BAD_REQUEST, "AUTH_003", "인증번호가 만료되었거나 존재하지 않습니다."),
    EMAIL_CODE_MISMATCH(HttpStatus.BAD_REQUEST, "AUTH_004", "인증번호가 일치하지 않습니다"),
    DUPLICATE_EMAIL(HttpStatus.CONFLICT, "AUTH_005", "이미 사용 중인 이메일입니다."),
    EMAIL_NOT_VERIFIED(HttpStatus.BAD_REQUEST, "AUTH_006", "이메일 인증이 완료되지 않았습니다."),

    // business 관련
    VERIFICATION_NOT_FOUND(HttpStatus.NOT_FOUND, "BUSINESS_001", "사업자 번호가 일치하는 사업자 정보를 찾을 수 없습니다."),
    BUSINESS_INFO_MISMATCH(HttpStatus.BAD_REQUEST, "BUSINESS_002", "입력한 사업자 정보와 실제 등록된 사업자 정보가 일치하지 않습니다."),
    BUSINESS_CODE_NOT_FOUND(HttpStatus.NOT_FOUND,"BUSINESS_003", "업종 코드가 존재하지 않습니다."),
    BUSINESS_INFO_NOT_FOUND(HttpStatus.NOT_FOUND, "BUSINESS_O04", "등록된 사업자 정보가 없습니다."),

    // 상권 분석 관련
    // 파라미터 누락/형식 오류는 도메인 코드를 따로 두지 않고 COMMON_001 을 쓴다.
    DONG_NOT_FOUND(HttpStatus.NOT_FOUND, "MARKET_001", "존재하지 않는 행정동입니다."),
    MARKET_BUSINESS_NOT_FOUND(HttpStatus.NOT_FOUND, "MARKET_002", "존재하지 않는 업종입니다."),
    MARKET_DATA_NOT_FOUND(HttpStatus.NOT_FOUND, "MARKET_003", "해당 상권에 집계된 업종 데이터가 없습니다."),

    // 외부 API
    FINANCE_API_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "EXTERNAL_001", "금융망 API 호출에 실패했습니다.");


    private final HttpStatus status;
    private final String code;
    private final String message;

    ErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }
}