package com.sobi.business.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 업체 월별 매출·세액. 마이데이터 연동으로 적재한다.
 * period 는 귀속 월 1일 (예: 2026-08-01).
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
        name = "business_tax",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_business_tax_period",
                columnNames = {"business_id", "period"}
        )
)
public class BusinessTax {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_id", nullable = false)
    private BusinessInfo business;

    @Column(nullable = false)
    private LocalDate period;

    @Column(nullable = false)
    private Long revenue;

    @Column(nullable = false)
    private Long tax;

    public static BusinessTax of(BusinessInfo business, LocalDate period, Long revenue, Long tax) {
        BusinessTax entity = new BusinessTax();
        entity.business = business;
        entity.period = period;
        entity.revenue = revenue;
        entity.tax = tax;
        return entity;
    }
}