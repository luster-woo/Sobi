package com.sobi.support.entity;



import com.sobi.business.entity.BusinessInfo;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Getter
@Table(name = "suggest_support_program")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SuggestSupportProgram {

    @EmbeddedId
    private SuggestSupportProgramId id;

    @MapsId("supportProgramId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "support_program_id",
            nullable = false
    )
    private SupportProgram supportProgram;

    @MapsId("businessId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "business_id",
            nullable = false
    )
    private BusinessInfo business;

    @CreationTimestamp
    @Column(
            name = "created_at",
            nullable = false,
            updatable = false
    )
    private LocalDateTime createdAt;

    @Column(length = 255)
    private String reason;
}