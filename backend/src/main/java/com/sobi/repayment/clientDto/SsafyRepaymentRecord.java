package com.sobi.repayment.clientDto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SsafyRepaymentRecord {

    private String accountNo;
    private String accountName;
    private String status;
    private String accountTypeUniqueNo;
    private String loanBalance;
    private String remainingLoanBalance;
    private String withdrawalAccountNo;
    private List<RepaymentRecordList> repaymentRecords;


}
