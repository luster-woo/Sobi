package com.sobi.mydata.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;

/**
 * 마이데이터 수집에 필요한 값 묶음.
 * 트랜잭션 밖에서 쓰이므로 엔티티가 아니라 값으로만 들고 나간다.
 */
@Getter
@Builder
public class MydataSnapshot {

    private final Long userId;
    private final String userKey;
    private final LocalDate birthDate;

    private final Long businessId;
    private final Long businessCodeId;
    private final String businessCode;
    private final String region;
    private final String address;
    private final Integer employeeCount;
    private final LocalDate openDate;

    /** 마이데이터 월별 매출. business_tax 로 그대로 옮긴다. */
    private final List<MonthlyTax> taxes;

    /** 마이데이터상 가입된 보험 id */
    private final List<Long> joinedInsuranceIds;

    /** 최근 12개월 매출 합. 자료가 없으면 null (AI 는 매출 조건을 통과 처리한다) */
    private final Long annualRevenue;

    @Getter
    @Builder
    public static class MonthlyTax {
        private final LocalDate period;
        private final Long revenue;
        private final Long tax;
    }
}