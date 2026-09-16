package com.sobi.insurance.repository;

import com.sobi.insurance.entity.Insurance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface InsuranceRepository extends JpaRepository<Insurance, Long> {

    /**
     * 체크리스트 대상 보험.
     * 사회보험은 업종과 무관하게 전부, 의무보험은 code_insurance 매핑을 탄다.
     * code_insurance 는 엔티티가 없어 네이티브 쿼리로 조회한다.
     */
    @Query(value = """
            SELECT i.* FROM insurance i
            WHERE i.category = 'SOCIAL'
               OR i.id IN (SELECT ci.insurance_id
                           FROM code_insurance ci
                           WHERE ci.code_id = :businessCodeId)
            ORDER BY i.id
            """, nativeQuery = true)
    List<Insurance> findAllForBusinessCode(@Param("businessCodeId") Long businessCodeId);
}