package com.sobi.funding.domain;


import java.math.BigDecimal;


// 추천 조합을 만들었을 때 해당 상품에서 실제로 얼마를 가져왔는지
public record FundingItemResult(

        Long id,

        FundingSourceType sourceType,

        FundingType fundingType,

        String name,

        // 추천 조합에서 실제로 선택한 금액
        long allocatedAmount,

        BigDecimal interestRate

) {
}