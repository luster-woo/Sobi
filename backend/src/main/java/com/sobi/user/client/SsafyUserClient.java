package com.sobi.user.client;

import com.sobi.global.external.ssafy.client.SsafyFinanceClient;
import com.sobi.global.external.ssafy.header.SsafyFinanceApi;
import com.sobi.global.external.ssafy.header.SsafyHeaderFactory;
import com.sobi.global.external.ssafy.header.SsafyRequestHeader;
import com.sobi.repayment.clientDto.SsafyInquireLoanAccountListRequest;
import com.sobi.repayment.clientDto.SsafyInquireLoanAccountListResponse;
import com.sobi.user.clientDto.SsafyInquireDemandDepositAccountListResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SsafyUserClient {
    private final SsafyFinanceClient financeClient;
    private final SsafyHeaderFactory headerFactory;

    public SsafyInquireDemandDepositAccountListResponse inquireDemandDepositAccountList(
            String userKey
    ) {

        SsafyRequestHeader header =
                headerFactory.create(
                        SsafyFinanceApi.INQUIRE_ACCOUNT_LIST,
                        userKey
                );

        SsafyInquireLoanAccountListRequest request =
                SsafyInquireLoanAccountListRequest.builder()
                        .header(header)
                        .build();

        return financeClient.post(
                "/edu/demandDeposit/inquireDemandDepositAccountList",
                request,
                SsafyInquireDemandDepositAccountListResponse.class
        );
    }

}
