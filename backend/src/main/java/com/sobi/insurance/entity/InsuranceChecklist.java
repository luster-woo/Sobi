package com.sobi.insurance.entity;

import com.sobi.business.entity.BusinessInfo;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
        name = "insurance_checklist",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_insurance_checklist",
                columnNames = {"business_id", "insurance_id"}
        )
)
public class InsuranceChecklist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_id", nullable = false)
    private BusinessInfo business;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "insurance_id", nullable = false)
    private Insurance insurance;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private InsuranceStatus status;

    /**
     * 사용자가 확인 필요 항목을 판단한 결과를 반영
     * 가입 완료는 마이데이터가 결정
     */
    public void changeStatus(InsuranceStatus next) {
        this.status = next;
    }

    public static InsuranceChecklist of(BusinessInfo business, Insurance insurance,
                                        InsuranceStatus status) {
        InsuranceChecklist entity = new InsuranceChecklist();
        entity.business = business;
        entity.insurance = insurance;
        entity.status = status;
        return entity;
    }
}
