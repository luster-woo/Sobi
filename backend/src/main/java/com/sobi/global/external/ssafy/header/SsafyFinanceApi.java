package com.sobi.global.external.ssafy.header;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SsafyFinanceApi {

    INQUIRE_LOAN_ACCOUNT_LIST(
            "inquireLoanAccountList",
            "inquireLoanAccountList",
            SsafyAuthType.BOTH
    ),

    INQUIRE_REPAYMENT_RECORDS(
            "inquireRepaymentRecords",
            "inquireRepaymentRecords",
            SsafyAuthType.BOTH
    ),

    UPDATE_REPAYMENT_LOAN_BALANCE_IN_FULL(
            "updateRepaymentLoanBalanceInFull",
            "updateRepaymentLoanBalanceInFull",
            SsafyAuthType.BOTH
    );

    private final String apiName;
    private final String apiServiceCode;
    private final SsafyAuthType authType;
}