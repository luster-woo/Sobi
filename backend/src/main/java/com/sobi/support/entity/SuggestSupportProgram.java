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
    private JudgementStatus status;

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

    /** jev(자격 판정) / llm(Jev 장애 시 GMS 폴백) / sql(정형 필터 탈락) */
    @Column(name = "judged_by", nullable = false, length = 3)
    private String judgedBy;

    /**
     * 판정 사유 설명. AI 가 생성한 문장이고, null 이면 아직 만들지 않았다는 뜻이다.
     *
     * <p>생성에 GMS 크레딧과 2~3초가 들기 때문에 여기 담아두고 재사용한다.
     * 별도 무효화는 필요 없다 — 마이데이터를 다시 연동하면 판정 행 자체가
     * 지워졌다 다시 들어오므로 설명도 같이 사라진다.
     */
    @Column(columnDefinition = "TEXT")
    private String explanation;

    /**
     * 생성된 설명을 붙인다. 이 엔티티에서 나중에 바뀌는 값은 이것뿐이라
     * 세터를 열지 않고 이 메서드만 둔다.
     */
    public void applyExplanation(String explanation) {
        this.explanation = explanation;
    }

    public static SuggestSupportProgram of(
            SupportProgram supportProgram,
            BusinessInfo business,
            JudgementStatus status,
            String reason,
            List<String> checkItems,
            List<String> benefits,
            Double distance,
            String judgedBy
    ) {
        SuggestSupportProgram entity = new SuggestSupportProgram();
        // @MapsId 가 채워주려면 복합키 객체가 미리 있어야 한다. null 이면 세터 호출에서 NPE 가 난다.
        entity.id = new SuggestSupportProgramId(supportProgram.getId(), business.getId());
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