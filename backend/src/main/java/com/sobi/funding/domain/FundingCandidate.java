package com.sobi.funding.domain;


import java.math.BigDecimal;

// 대출 상품, 지원사업 대출, 지원금을 하나의 객체로 통일함
public record FundingCandidate(

        Long id,

        // 어느 테이블 데이터인지
        FundingSourceType sourceType,

        // 지원금인지 대출인지
        FundingType fundingType,

        String name,

        long minAmount,

        long maxAmount,

        // 지원금일 경우 0
        BigDecimal interestRate

) {
}