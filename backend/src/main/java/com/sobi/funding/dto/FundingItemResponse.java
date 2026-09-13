package com.sobi.funding.dto;



import com.sobi.funding.domain.FundingItemResult;
import com.sobi.funding.domain.FundingSourceType;
import com.sobi.funding.domain.FundingType;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class FundingItemResponse {

    private FundingSourceType sourceType;
    private FundingType fundingType;

    private Long id;
    private String name;

    private Long allocatedAmount;
    private BigDecimal interestRate;

    public static FundingItemResponse from(FundingItemResult item) {
        return FundingItemResponse.builder()
                .sourceType(item.sourceType())
                .fundingType(item.fundingType())
                .id(item.id())
                .name(item.name())
                .allocatedAmount(item.allocatedAmount())
                .interestRate(item.interestRate())
                .build();
    }
}