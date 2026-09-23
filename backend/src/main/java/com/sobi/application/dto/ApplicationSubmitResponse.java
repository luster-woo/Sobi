package com.sobi.application.dto;

import com.sobi.application.entity.Application;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

// 제출 결과. 대출은 심사 거절이어도 200 으로 응답하고 status 로 구분한다
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ApplicationSubmitResponse {

    private final Long applicationId;
    private final String status;        // PAID (지급 완료) / REJECTED (심사 거절)
    private final String rejectReason;
    private final Long amount;
    private final String loanAccountNo; // 개설된 대출 계좌번호 (대출 실행 시에만)

    public static ApplicationSubmitResponse of(Application application, String loanAccountNo) {
        return new ApplicationSubmitResponse(
                application.getId(),
                application.getStatus(),
                application.getRejectReason(),
                application.getAmount(),
                loanAccountNo
        );
    }
}
