package com.sobi.support.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 공고에서 추출한 신청 조건. AI 서버가 LLM 으로 뽑아 적재한다.
 *
 * 정형 컬럼만 매핑한다. llm_conditions(JSONB)는 AI 판정 프롬프트용이라
 * 백엔드가 읽을 일이 없다.
 */
@Entity
@Getter
@Table(name = "program_condition")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProgramCondition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "support_program_id", nullable = false, unique = true)
    private SupportProgram supportProgram;

    /** 전국 대상 공고. true 면 region_sido 는 null 이다 */
    @Column(nullable = false)
    private boolean nationwide;

    /** 시도. business_info.region 과 같은 16개 표준 표기 */
    @Column(name = "region_sido", length = 20)
    private String regionSido;

    /** 소상공인 / 소공인 / 중소기업 / 무관 */
    @Column(name = "target_scale", length = 10)
    private String targetScale;

    /** 표준 융자제외업종 해당 여부 */
    @Column(name = "std_exclusion", nullable = false)
    private boolean stdExclusion;

    @Column(name = "max_revenue")
    private Long maxRevenue;

    @Column(name = "min_biz_months")
    private Integer minBizMonths;

    @Column(name = "max_biz_months")
    private Integer maxBizMonths;

    /** llm(LLM 추출) / tag(기업마당 태그) */
    @Column(length = 10)
    private String source;

    @Column(name = "extracted_at")
    private LocalDateTime extractedAt;
}