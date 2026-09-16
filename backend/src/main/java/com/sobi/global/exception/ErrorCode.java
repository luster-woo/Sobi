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
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "AUTH_007", "유효하지 않은 토큰입니다."),
    EXPIRED_TOKEN(HttpStatus.UNAUTHORIZED, "AUTH_008", "만료된 토큰입니다."),
    LOGIN_FAILED(HttpStatus.UNAUTHORIZED, "AUTH_009", "이메일 또는 비밀번호가 올바르지 않습니다."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "AUTH_010", "인증이 필요합니다."),
    INVALID_RESET_TOKEN(HttpStatus.BAD_REQUEST, "AUTH_011", "유효하지 않거나 만료된 요청입니다. 이메일 인증을 다시 진행해주세요."),
    OAUTH_PROVIDER_NOT_SUPPORTED(HttpStatus.BAD_REQUEST, "AUTH_012", "지원하지 않는 소셜 로그인입니다."),
    OAUTH_CODE_INVALID(HttpStatus.BAD_REQUEST, "AUTH_013", "소셜 로그인 인증에 실패했습니다."),
    EMAIL_ALREADY_REGISTERED(HttpStatus.CONFLICT, "AUTH_014", "이미 이메일로 가입된 계정입니다. 이메일 로그인 후 소셜 계정을 연결해주세요."),
    ALREADY_SOCIAL_ACCOUNT(HttpStatus.CONFLICT, "AUTH_015", "이미 소셜 계정으로 전환된 계정입니다."),
    SOCIAL_EMAIL_MISMATCH(HttpStatus.BAD_REQUEST, "AUTH_016", "계정 이메일과 일치하는 구글 계정만 연결할 수 있습니다."),
    LOCAL_LOGIN_ONLY(HttpStatus.BAD_REQUEST, "AUTH_017", "소셜 로그인 계정은 비밀번호를 변경할 수 없습니다."),
    SOCIAL_LOGIN_RESET_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "AUTH_018", "소셜 로그인으로 가입된 계정입니다. 소셜 로그인으로 시도해주세요."),

    // 마이데이터
    MYDATA_NOT_FOUND(HttpStatus.NOT_FOUND, "MYDATA_001", "마이데이터에 등록되지 않은 사업자입니다."),
    MYDATA_REFRESH_COOLDOWN(HttpStatus.TOO_MANY_REQUESTS, "MYDATA_002", "마이데이터를 다시 불러오기까지 시간이 남았습니다."),

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

    // 의무보험 관련
    INSURANCE_CHECKLIST_NOT_FOUND(HttpStatus.NOT_FOUND, "INSURANCE_001", "존재하지 않는 의무보험 항목입니다."),
    INSURANCE_STATUS_NOT_CHANGEABLE(HttpStatus.BAD_REQUEST, "INSURANCE_002", "확인이 필요한 항목만 상태를 변경할 수 있습니다."),
    INSURANCE_STATUS_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "INSURANCE_003", "가입 필요 또는 가입 제외로만 변경할 수 있습니다."),

    // 외부 API
    FINANCE_API_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "EXTERNAL_001", "금융망 API 호출에 실패했습니다."),

    // 외부 API - AI 서버
    AI_API_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "EXTERNAL_002", "지원사업 추천 서버 호출에 실패했습니다."),

    // funding 관련
    TARGET_AMOUNT_ERROR(HttpStatus.BAD_REQUEST, "FUNDING_001", "목표 금액은 0보다 커야합니다."),

    // bookmark 관련
    LOAN_NOT_FOUND(HttpStatus.NOT_FOUND, "BOOKMARK_001", "해당 id의 대출상품을 찾을 수 없습니다."),
    SUPPROT_NOT_FOUND(HttpStatus.NOT_FOUND, "BOOKMARK_002", "해당 id의 지원사업을 찾을 수 없습니다."),
    BOOKMARK_ALREADY_EXISTS(HttpStatus.CONFLICT, "BOOKMARK_003", "이미 관심목록에 등록되어있는 상품/사업입니다."),
    TYPE_BAD_REQUEST(HttpStatus.BAD_REQUEST, "BOOKMARK_004", "타입 입력이 잘못되었습니다."),
    BOOKMARK_NOT_FOUND(HttpStatus.NOT_FOUND, "BOOKMARK_005", "해당 북마크를 찾을 수 없습니다."),

    // application 관련
    APPLICATION_NOT_FOUND(HttpStatus.NOT_FOUND, "APPLICATION_001", "존재하지 않는 신청입니다."),
    APPLICATION_ALREADY_IN_PROGRESS(HttpStatus.CONFLICT, "APPLICATION_002", "이미 신청이 진행 중이거나 지급이 완료된 상품입니다."),
    APPLICATION_TYPE_BAD_REQUEST(HttpStatus.BAD_REQUEST, "APPLICATION_003", "신청 종류는 LOAN 또는 SUPPORT 만 가능합니다."),
    APPLICATION_PERIOD_CLOSED(HttpStatus.BAD_REQUEST, "APPLICATION_004", "신청 기간이 아닌 지원사업입니다."),
    APPLICATION_STATUS_BAD_REQUEST(HttpStatus.BAD_REQUEST, "APPLICATION_005", "신청 상태 필터는 IN_PROGRESS 또는 DONE 만 가능합니다."),
    APPLICATION_CANCEL_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "APPLICATION_006", "작성 중인 신청만 취소할 수 있습니다."),
    APPLICATION_SUBMIT_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "APPLICATION_007", "작성 중인 신청만 제출할 수 있습니다."),
    APPLICATION_DOCUMENT_NOT_COMPLETED(HttpStatus.BAD_REQUEST, "APPLICATION_008", "모든 서류의 검증이 완료되어야 신청할 수 있습니다."),
    APPLICATION_AMOUNT_INVALID(HttpStatus.BAD_REQUEST, "APPLICATION_009", "신청 금액이 상품의 한도 범위를 벗어났습니다."),
    APPLICATION_ACCOUNT_INVALID(HttpStatus.BAD_REQUEST, "APPLICATION_010", "본인의 수시입출금 계좌를 선택해야 합니다."),
    APPLICATION_NOT_ELIGIBLE(HttpStatus.BAD_REQUEST, "APPLICATION_011", "신청 조건을 충족하지 않습니다.");


    private final HttpStatus status;
    private final String code;
    private final String message;

    ErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }
}