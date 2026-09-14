package com.sobi.insurance.repository;

import com.sobi.insurance.entity.InsuranceChecklist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InsuranceChecklistRepository extends JpaRepository<InsuranceChecklist, Long> {

    /**
     * 목록API
     * 
     * 목록 화면은 fetch join하여 보험 정보까지 같이
     * 정렬은 사회보험 먼저, insurance.id 순(국민연금·건강보험·고용·산재)
     */
    @Query("""
            SELECT c FROM InsuranceChecklist c
            JOIN FETCH c.insurance i
            WHERE c.business.id = :businessId
            ORDER BY CASE WHEN i.category = com.sobi.insurance.entity.InsuranceCategory.SOCIAL
                          THEN 0 ELSE 1 END, i.id
            """)
    List<InsuranceChecklist> findAllByBusinessId(@Param("businessId") Long businessId);

    /**
     * 상세, 상태 변경 API 
     */
    @Query("""
            SELECT c FROM InsuranceChecklist c
            JOIN FETCH c.insurance i
            WHERE c.id = :checklistId
              AND c.business.user.id = :userId
            """)
    Optional<InsuranceChecklist> findByIdAndUserId(@Param("checklistId") Long checklistId,
                                                   @Param("userId") Long userId);
}
