package com.sobi.loan.entity;



import com.sobi.business.entity.BusinessInfo;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Getter
@Table(name = "suggest_loan")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SuggestLoan {

    @EmbeddedId
    private SuggestLoanId id;

    @MapsId("businessId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "business_id",
            nullable = false
    )
    private BusinessInfo business;

    @MapsId("loanId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "loan_id",
            nullable = false
    )
    private Loan loan;

    @CreationTimestamp
    @Column(
            name = "created_at",
            nullable = false,
            updatable = false
    )
    private LocalDateTime createdAt;


    public static SuggestLoan of(BusinessInfo business, Loan loan) {
        SuggestLoan entity = new SuggestLoan();
        // @MapsId 가 채워주려면 복합키 객체가 미리 있어야 한다. null 이면 세터 호출에서 NPE 가 난다.
        entity.id = new SuggestLoanId(business.getId(), loan.getId());
        entity.business = business;
        entity.loan = loan;
        return entity;
    }
}