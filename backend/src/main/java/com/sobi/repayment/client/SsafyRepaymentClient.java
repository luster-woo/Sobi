package com.sobi.repayment.client;

import com.sobi.global.external.ssafy.client.SsafyFinanceClient;
import com.sobi.global.external.ssafy.header.SsafyFinanceApi;
import com.sobi.global.external.ssafy.header.SsafyHeaderFactory;
import com.sobi.global.external.ssafy.header.SsafyRequestHeader;
import com.sobi.repayment.clientDto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SsafyRepaymentClient {

    private final SsafyFinanceClient financeClient;
    private final SsafyHeaderFactory headerFactory;

    public SsafyInquireLoanAccountListResponse inquireLoanAccountList(
            String userKey
    ) {

        SsafyRequestHeader header =
                headerFactory.create(
                        SsafyFinanceApi.INQUIRE_LOAN_ACCOUNT_LIST,
                        userKey
                );

        SsafyInquireLoanAccountListRequest request =
                SsafyInquireLoanAccountListRequest.builder()
                        .header(header)
                        .build();

        return financeClient.post(
                "/edu/loan/inquireLoanAccountList",
                request,
                SsafyInquireLoanAccountListResponse.class
        );
    }

    public SsafyInquireRepaymentRecordsResponse inquireRepaymentRecords(
            String userKey,
            String accountNo
    ) {

        SsafyRequestHeader header =
                headerFactory.create(
                        SsafyFinanceApi.INQUIRE_REPAYMENT_RECORDS,
                        userKey
                );

        SsafyInquireRepaymentRecordsRequest request =
                SsafyInquireRepaymentRecordsRequest.builder()
                        .header(header)
                        .accountNo(accountNo)
                        .build();

        return financeClient.post(
                "/실제-SSAFY-상환내역-조회-URL",
                request,
                SsafyInquireRepaymentRecordsResponse.class
        );
    }

    public SsafyUpdateRepaymentLoanBalanceInFullResponse
    updateRepaymentLoanBalanceInFull(
            String userKey,
            String accountNo
    ) {

        SsafyRequestHeader header =
                headerFactory.create(
                        SsafyFinanceApi.UPDATE_REPAYMENT_LOAN_BALANCE_IN_FULL,
                        userKey
                );

        SsafyUpdateRepaymentLoanBalanceInFullRequest request =
                SsafyUpdateRepaymentLoanBalanceInFullRequest.builder()
                        .header(header)
                        .accountNo(accountNo)
                        .build();

        return financeClient.post(
                "/실제-SSAFY-일시납-상환-URL",
                request,
                SsafyUpdateRepaymentLoanBalanceInFullResponse.class
        );
    }
}