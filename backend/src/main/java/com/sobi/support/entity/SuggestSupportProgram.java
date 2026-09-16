package com.sobi.support.entity;



import com.sobi.business.entity.BusinessInfo;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;

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

    @Column(length = 500)
    private String reason;

    /** 자격 판정 (eligible / unknown / ineligible) */
    @Column(nullable = false, length = 10)
    private String status;

    /** 신청 전 본인이 확인해야 할 항목 */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "check_items", columnDefinition = "jsonb")
    private List<String> checkItems;

    /** 우대·가점 조건. 판정에는 쓰지 않음 */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<String> benefits;

    /** 코사인 거리. 0에 가까울수록 유사. SQL 필터 탈락 건은 null */
    private Double distance;

    /** llm(조건 판정) / sql(정형 필터 탈락) */
    @Column(name = "judged_by", nullable = false, length = 3)
    private String judgedBy;

    public static SuggestSupportProgram of(
            SupportProgram supportProgram,
            BusinessInfo business,
            String status,
            String reason,
            List<String> checkItems,
            List<String> benefits,
            Double distance,
            String judgedBy
    ) {
        SuggestSupportProgram entity = new SuggestSupportProgram();
        entity.supportProgram = supportProgram;
        entity.business = business;
        entity.status = status;
        entity.reason = reason;
        entity.checkItems = checkItems;
        entity.benefits = benefits;
        entity.distance = distance;
        entity.judgedBy = judgedBy;
        return entity;
    }
}