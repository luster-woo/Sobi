package com.sobi.funding.dto;



import com.sobi.funding.domain.FundingCombination;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class FundingRecommendResponse {

    private Long targetAmount;

    private List<FundingCombinationResponse> recommendedCombinations;

    public static FundingRecommendResponse from(
            Long targetAmount,
            List<FundingCombination> combinations
    ) {
        return FundingRecommendResponse.builder()
                .targetAmount(targetAmount)
                .recommendedCombinations(
                        combinations.stream()
                                .map(FundingCombinationResponse::from)
                                .toList()
                )
                .build();
    }
}