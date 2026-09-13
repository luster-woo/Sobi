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
}