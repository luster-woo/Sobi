package com.sobi.global.external.ssafy.header;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SsafyFinanceApi {

    // 대출 상품 (2.7.1 ~ 2.7.3) - 사용자와 무관하므로 apiKey 만 사용
    INQUIRE_ASSET_BASED_CREDIT_RATING_LIST(
            "inquireAssetBasedCreditRatingList",
            "inquireAssetBasedCreditRatingList",
            SsafyAuthType.API_KEY
    ),

    CREATE_LOAN_PRODUCT(
            "createLoanProduct",
            "createLoanProduct",
            SsafyAuthType.API_KEY
    ),

    INQUIRE_LOAN_PRODUCT_LIST(
            "inquireLoanProductList",
            "inquireLoanProductList",
            SsafyAuthType.API_KEY
    ),

    // 대출 가입·상환 (2.7.8 ~ 2.7.10)
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
    ),

    INQUIRE_ACCOUNT_LIST(
            "inquireDemandDepositAccountList",
            "inquireDemandDepositAccountList",
            SsafyAuthType.BOTH
    );



    private final String apiName;
    private final String apiServiceCode;
    private final SsafyAuthType authType;
}