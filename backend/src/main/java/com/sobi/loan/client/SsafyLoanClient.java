package com.sobi.loan.client;

import com.sobi.global.external.ssafy.client.SsafyFinanceClient;
import com.sobi.global.external.ssafy.header.SsafyFinanceApi;
import com.sobi.global.external.ssafy.header.SsafyHeaderFactory;
import com.sobi.global.external.ssafy.header.SsafyRequestHeader;
import com.sobi.loan.clientDto.*;
import com.sobi.loan.entity.Loan;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 싸피 금융망 대출 API 호출 
 */
@Component
@RequiredArgsConstructor
public class SsafyLoanClient {

    private final SsafyFinanceClient financeClient;
    private final SsafyHeaderFactory headerFactory;

    // 2.7.1 신용등급 기준 조회 - 등급명(A~E)을 상품 등록에 필요한 ratingUniqueNo 로 바꿀 때 사용
    public SsafyInquireCreditRatingListResponse inquireCreditRatingList() {

        SsafyRequestHeader header =
                headerFactory.create(
                        SsafyFinanceApi.INQUIRE_ASSET_BASED_CREDIT_RATING_LIST,
                        null
                );

        SsafyInquireCreditRatingListRequest request =
                SsafyInquireCreditRatingListRequest.builder()
                        .header(header)
                        .build();

        return financeClient.post(
                "/edu/loan/inquireAssetBasedCreditRatingList",
                request,
                SsafyInquireCreditRatingListResponse.class
        );
    }

    // 2.7.3 대출 상품 조회 - 우리 apiKey 로 등록된 상품만 조회된다
    public SsafyInquireLoanProductListResponse inquireLoanProductList() {

        SsafyRequestHeader header =
                headerFactory.create(
                        SsafyFinanceApi.INQUIRE_LOAN_PRODUCT_LIST,
                        null
                );

        SsafyInquireLoanProductListRequest request =
                SsafyInquireLoanProductListRequest.builder()
                        .header(header)
                        .build();

        return financeClient.post(
                "/edu/loan/inquireLoanProductList",
                request,
                SsafyInquireLoanProductListResponse.class
        );
    }

    // 2.7.2 대출 상품 등록 - 수정·삭제 API가 없으므로 호출 전 중복 여부를 반드시 확인할 것
    public SsafyCreateLoanProductResponse createLoanProduct(
            Loan loan,
            String ratingUniqueNo
    ) {

        SsafyRequestHeader header =
                headerFactory.create(
                        SsafyFinanceApi.CREATE_LOAN_PRODUCT,
                        null
                );

        SsafyCreateLoanProductRequest request =
                SsafyCreateLoanProductRequest.builder()
                        .header(header)
                        .bankCode(loan.getBankCode())
                        .accountName(loan.getAccountName())
                        .accountDescription(loan.getDescription())
                        .ratingUniqueNo(ratingUniqueNo)
                        .loanPeriod(String.valueOf(loan.getPeriod()))
                        .minLoanBalance(String.valueOf(loan.getMinLoanBalance()))
                        .maxLoanBalance(String.valueOf(loan.getMaxLoanBalance()))
                        .interestRate(String.valueOf(loan.getInterestRate()))
                        .build();

        return financeClient.post(
                "/edu/loan/createLoanProduct",
                request,
                SsafyCreateLoanProductResponse.class
        );
    }
}
