package com.sobi.funding.dto;



import com.sobi.funding.domain.FundingCombination;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Builder
public class FundingCombinationResponse {

    private List<FundingItemResponse> items;

    private Long totalFinancingAmount;
    private Long grantAmount;
    private Long loanPrincipal;

    private BigDecimal averageInterestRate;

    private Long monthlyRepaymentAmount;
    private Long totalInterest;
    private Long totalRepaymentAmount;

    public static FundingCombinationResponse from(FundingCombination combination) {
        return FundingCombinationResponse.builder()
                .items(
                        combination.items().stream()
                                .map(FundingItemResponse::from)
                                .toList()
                )
                .totalFinancingAmount(combination.totalFinancingAmount())
                .grantAmount(combination.grantAmount())
                .loanPrincipal(combination.loanPrincipal())
                .averageInterestRate(combination.averageInterestRate())
                .monthlyRepaymentAmount(combination.monthlyRepaymentAmount())
                .totalInterest(combination.totalInterest())
                .totalRepaymentAmount(combination.totalRepaymentAmount())
                .build();
    }
}