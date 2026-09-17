package com.sobi.support.repository;

import com.sobi.support.entity.SupportProgram;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SupportProgramRepository extends JpaRepository<SupportProgram, Long> {

    /**
     * 접수 중인 공고. 지역을 주면 해당 시도와 전국 공고만 남긴다.
     *
     * 판정이 사용자마다 달라 DB 에서 정렬할 수 없으므로 전체를 가져와 메모리에서 처리한다.
     * 공고가 222건이라 지금 규모에서는 문제가 없다.
     *
     * ProgramCondition 은 SupportProgram 과 양방향 연관이 없어 엔티티 조인으로 붙인다.
     */
    @Query("""
            SELECT sp FROM SupportProgram sp
            LEFT JOIN ProgramCondition c ON c.supportProgram.id = sp.id
            WHERE (sp.endDate IS NULL OR sp.endDate >= CURRENT_DATE)
              AND (:region IS NULL
                   OR c.id IS NULL
                   OR c.nationwide = true
                   OR c.regionSido = :region)
            """)
    List<SupportProgram> findAllOpen(@Param("region") String region);

    /** 검색 결과 id 들. 마감된 공고는 목록과 마찬가지로 뺀다 */
    @Query("""
            SELECT sp FROM SupportProgram sp
            WHERE sp.id IN :ids
              AND (sp.endDate IS NULL OR sp.endDate >= CURRENT_DATE)
            """)
    List<SupportProgram> findAllOpenByIds(@Param("ids") List<Long> ids);
}