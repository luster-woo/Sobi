package com.sobi.funding.domain;


import java.math.BigDecimal;
import java.util.List;

public record FundingCombination(

        List<FundingItemResult> items,

        // 가져오는 토탈 금액
        long totalFinancingAmount,

        // 지원금 금액
        long grantAmount,

        // 대출금 금액
        long loanPrincipal,

        // 평균 금리
        BigDecimal averageInterestRate,

        // 월별 갚아야하는 금액
        long monthlyRepaymentAmount,

        // 토탈 이자 금액
        long totalInterest,

        // 총 갚아야하는 돈 -> 대출금 + 토탈 이자 금액
        long totalRepaymentAmount

) {
}