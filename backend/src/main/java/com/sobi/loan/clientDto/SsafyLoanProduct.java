package com.sobi.loan.clientDto;

import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 대출 상품 등록 / 조회 응답의 상품 정보. 금융망이 숫자도 문자열로 내려준다.
 */
@Getter
@NoArgsConstructor
public class SsafyLoanProduct {

    private String accountTypeUniqueNo;      // 상품 고유번호 (loan.account_type_unique_no)
    private String bankCode;
    private String bankName;
    private String ratingUniqueNo;
    private String ratingName;               // 가입 가능한 최소 신용등급
    private String accountName;
    private String loanPeriod;               // 일 단위
    private String minLoanBalance;
    private String maxLoanBalance;
    private String interestRate;
    private String accountDescription;
    private String accountTypeCode;          // 4: 대출
    private String accountTypeName;
    private String loanTypeCode;             // 001: 신용대출 (고정)
    private String loanTypeName;
    private String repaymentMethodTypeCode;  // 0001: 원리금균등상환 (고정)
    private String repaymentMethodTypeName;
}
