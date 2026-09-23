package com.sobi.mydata.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 월별 매출·세액 (마이데이터). period 는 귀속 월 1일.
 */
@Entity
@Getter
@Table(name = "mydata_tax")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MydataTax {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mydata_id", nullable = false)
    private Mydata mydata;

    @Column(nullable = false)
    private LocalDate period;

    @Column(nullable = false)
    private Long revenue;

    @Column(nullable = false)
    private Long tax;
}