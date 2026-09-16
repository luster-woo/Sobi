package com.sobi.mydata.entity;

import com.sobi.insurance.entity.Insurance;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 가입 보험 (마이데이터). 여기 있는 보험은 insurance_checklist 에서 COMPLETED 가 된다.
 */
@Entity
@Getter
@Table(name = "mydata_insurance")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MydataInsurance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mydata_id", nullable = false)
    private Mydata mydata;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "insurance_id", nullable = false)
    private Insurance insurance;
}