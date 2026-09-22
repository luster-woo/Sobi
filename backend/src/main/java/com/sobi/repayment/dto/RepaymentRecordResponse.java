package com.sobi.repayment.dto;


import com.sobi.repayment.calculator.RepaymentSchedule;
import com.sobi.repayment.clientDto.RepaymentRecordList;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class RepaymentRecordResponse {

    private String installmentNumber;
    private String status;
    private String paymentBalance;

    private String repaymentAttemptDate;
    private String repaymentAttemptTime;

    private String repaymentActualDate;
    private String repaymentActualTime;

    private String failureReason;

    /**
     * 회차별 금액은 금융망이 준 paymentBalance 대신 우리가 계산한 값을 쓴다.
     * 금융망 값에는 회차마다 전체 기간치 이자가 붙어 있어 잔액과 맞아떨어지지 않는다.
     */
    public static RepaymentRecordResponse from(RepaymentRecordList record, RepaymentSchedule schedule) {

        long installmentNumber = Long.parseLong(record.getInstallmentNumber());

        return RepaymentRecordResponse.builder()
                .installmentNumber(record.getInstallmentNumber())
                .status(record.getStatus())
                .paymentBalance(String.valueOf(schedule.getInstallmentAmount(installmentNumber)))
                .repaymentAttemptDate(record.getRepaymentAttemptDate())
                .repaymentAttemptTime(record.getRepaymentAttemptTime())
                .repaymentActualDate(record.getRepaymentActualDate())
                .repaymentActualTime(record.getRepaymentActualTime())
                .failureReason(record.getFailureReason())
                .build();
    }
}