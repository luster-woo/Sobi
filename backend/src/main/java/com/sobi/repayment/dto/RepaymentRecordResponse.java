package com.sobi.repayment.dto;


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

    public static RepaymentRecordResponse from(RepaymentRecordList record) {
        return RepaymentRecordResponse.builder()
                .installmentNumber(record.getInstallmentNumber())
                .status(record.getStatus())
                .paymentBalance(record.getPaymentBalance())
                .repaymentAttemptDate(record.getRepaymentAttemptDate())
                .repaymentAttemptTime(record.getRepaymentAttemptTime())
                .repaymentActualDate(record.getRepaymentActualDate())
                .repaymentActualTime(record.getRepaymentActualTime())
                .failureReason(record.getFailureReason())
                .build();
    }
}