package com.sobi.repayment.dto;

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


    public static RecordResponse from(
            SsafyInquireRepaymentRecordsResponse response,
            Long totalPayoffAmount,
            Long interestSaved
    ) {
        return RecordResponse.builder()
                .accountNo(response.getRec().getAccountNo())
                .accountName(response.getRec().getAccountName())
                .status(response.getRec().getStatus())
                .accountTypeUniqueNo(response.getRec().getAccountTypeUniqueNo())
                .loanBalance(response.getRec().getLoanBalance())
                .remainingLoanBalance(response.getRec().getRemainingLoanBalance())
                .withdrawalAccountNo(response.getRec().getWithdrawalAccountNo())
                .repaymentRecords(
                        response.getRec()
                                .getRepaymentRecords()
                                .stream()
                                .map(RepaymentRecordResponse::from)
                                .toList()
                )
                .totalPayoffAmount(totalPayoffAmount)
                .interestSaved(interestSaved)
                .build();
    }
}
