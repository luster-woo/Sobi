package com.sobi.common.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 서울시 상권 정보. 행정동 x 업종 조합당 한 행이다.
 * 매출·유동인구는 분기 합계, 개·폐업 수는 최근 4분기 누계 값이므로
 * 응답으로 내보내기 전에 서비스에서 월/일/연 단위로 환산한다.
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "seoul_commercial_data")
public class SeoulCommercialData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "business_code", nullable = false, length = 20)
    private String businessCode;

    @Column(name = "business_name", nullable = false, length = 20)
    private String businessName;

    @Column(name = "month_revenue")
    private Long monthRevenue;

    @Column(name = "week_revenue")
    private Long weekRevenue;

    @Column(name = "weekend_revenue")
    private Long weekendRevenue;

    @Column(name = "male_revenue")
    private Long maleRevenue;

    @Column(name = "female_revenue")
    private Long femaleRevenue;

    @Column(name = "total_count", nullable = false)
    private Long totalCount;

    @Column(name = "open_count", nullable = false)
    private Long openCount;

    @Column(name = "close_count", nullable = false)
    private Long closeCount;

    @Column(name = "total_population", nullable = false)
    private Long totalPopulation;

    @Column(name = "male_population", nullable = false)
    private Long malePopulation;

    @Column(name = "female_population", nullable = false)
    private Long femalePopulation;

    @Column(name = "district_code", nullable = false, length = 20)
    private String districtCode;

    @Column(name = "district_name", nullable = false, length = 20)
    private String districtName;

    @Column(name = "dong_code", nullable = false, length = 20)
    private String dongCode;

    @Column(name = "dong_name", nullable = false, length = 20)
    private String dongName;
}
