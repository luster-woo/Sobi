package com.sobi.application.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * [신청하기] 요청. 금액·계좌는 임시 저장하지 않고 제출 시에만 받는다
 * 비금전 지원사업은 둘 다 없이 제출
 */
@Getter
@Setter
@NoArgsConstructor
public class ApplicationSubmitRequest {

    private Long amount;        // 신청 금액 (원)
    private Long accountId;     // 출금(대출) / 지급(지원금) 계좌. account.id
}
