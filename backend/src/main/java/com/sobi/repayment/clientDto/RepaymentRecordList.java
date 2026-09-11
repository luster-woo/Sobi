package com.sobi.repayment.clientDto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class RepaymentRecordList {

    private String installmentNumber;
    private String status;
    private String paymentBalance;
    private String repaymentAttemptDate;
    private String repaymentAttemptTime;
    private String repaymentActualDate;
    private String repaymentActualTime;
    private String failureReason;


}
