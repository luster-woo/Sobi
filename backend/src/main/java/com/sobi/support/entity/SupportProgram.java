package com.sobi.support.entity;


import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Getter
@Table(name = "support_program")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SupportProgram {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 기업마당 공고ID (upsert 키) */
    @Column(name = "pblanc_id", length = 30, unique = true)
    private String pblancId;

    @Column(
            name = "pblanc_nm",
            nullable = false,
            length = 300
    )
    private String pblancNm;

    @Column(
            name = "jrsdinstt_nm",
            nullable = false,
            length = 50
    )
    private String jrsdinsttNm;

    @Column(
            name = "excinstt_nm",
            nullable = false,
            length = 50
    )
    private String excinsttNm;

    @Column(
            name = "type",
            nullable = false,
            length = 10
    )
    private String type;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(
            name = "bsns_sumry_cn",
            length = 1000
    )
    private String bsnsSumryCn;

    @Column(
            name = "reqst_mth_papers_cn",
            length = 255
    )
    private String reqstMthPapersCn;

    @Column(
            name = "refrnc_nm",
            length = 100
    )
    private String refrncNm;

    @Column(
            name = "rcept_engn_hmpg_url",
            length = 1000
    )
    private String rceptEngnHmpgUrl;

    @Column(
            name = "print_flpth_nm",
            length = 1000
    )
    private String printFlpthNm;

    @Column(name = "min_balance")
    private Long minBalance;

    @Column(name = "max_balance")
    private Long maxBalance;

    @Column(name = "interest_rate")
    private Double interestRate;
}