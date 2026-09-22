package com.sobi.repayment.dto;

import com.sobi.repayment.calculator.RepaymentSchedule;
import com.sobi.repayment.clientDto.SsafyInquireRepaymentRecordsResponse;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
public class RecordResponse {

    private String accountNo;
    private String accountName;
    private String status;
    private String accountTypeUniqueNo;

    private String loanBalance;
    private String remainingLoanBalance;
    private String withdrawalAccountNo;

    private List<RepaymentRecordResponse> repaymentRecords;

    private Long totalPayoffAmount;
    private Long interestSaved;


    /**
     * 금액은 금융망 응답 대신 {@link RepaymentSchedule} 로 계산한 값을 담는다.
     * 금융망 값을 그대로 쓰면 이자가 회차 수만큼 부풀려져 내려간다.
     *
     * loanBalance 는 대출 원금, remainingLoanBalance 는 남은 상환액(원금 + 이자)이다.
     * 회차별 금액(paymentBalance)도 우리가 계산한 값으로 덮어쓴다 — 한 화면 안에서
     * 잔액과 회차 금액이 서로 맞아야 하기 때문이다.
     */
    public static RecordResponse from(
            SsafyInquireRepaymentRecordsResponse response,
            RepaymentSchedule schedule,
            Long remainingLoanBalance,
            Long totalPayoffAmount,
            Long interestSaved
    ) {
        return RecordResponse.builder()
                .accountNo(response.getRec().getAccountNo())
                .accountName(response.getRec().getAccountName())
                .status(response.getRec().getStatus())
                .accountTypeUniqueNo(response.getRec().getAccountTypeUniqueNo())
                .loanBalance(String.valueOf(schedule.getPrincipal()))
                .remainingLoanBalance(String.valueOf(remainingLoanBalance))
                .withdrawalAccountNo(response.getRec().getWithdrawalAccountNo())
                .repaymentRecords(
                        response.getRec()
                                .getRepaymentRecords()
                                .stream()
                                .map(record -> RepaymentRecordResponse.from(record, schedule))
                                .toList()
                )
                .totalPayoffAmount(totalPayoffAmount)
                .interestSaved(interestSaved)
                .build();
    }
}
