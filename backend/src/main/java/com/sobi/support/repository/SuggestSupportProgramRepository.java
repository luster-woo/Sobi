package com.sobi.support.repository;


import com.sobi.support.entity.SuggestSupportProgram;
import com.sobi.support.entity.SuggestSupportProgramId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SuggestSupportProgramRepository extends JpaRepository<SuggestSupportProgram, SuggestSupportProgramId> {

    @Query("""
            SELECT ssp
            FROM SuggestSupportProgram ssp
            JOIN FETCH ssp.supportProgram
            WHERE ssp.business.id = :businessId
            """)
    List<SuggestSupportProgram>
    findAllWithSupportProgramByBusinessId(
            @Param("businessId") Long businessId
    );

    /**
     * 판정 결과를 다시 계산할 때 기존 행을 모두 지운다.
     * 파생 쿼리(deleteByBusinessId)는 222건을 하나씩 조회 후 삭제하므로
     * 벌크 DELETE 로 한 번에 처리한다.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM SuggestSupportProgram s WHERE s.business.id = :businessId")
    void deleteAllByBusinessId(@Param("businessId") Long businessId);

    /**
     * 마지막으로 판정한 시각. 갱신 쿨다운 판단에 쓴다.
     * 판정 이력이 없으면 empty.
     */
    @Query("""
            SELECT MAX(s.createdAt)
            FROM SuggestSupportProgram s
            WHERE s.business.id = :businessId
            """)
    Optional<LocalDateTime> findLastJudgedAt(@Param("businessId") Long businessId);


    SuggestSupportProgram findByBusinessIdAndSupportProgram_Id(Long businessId, Long supportProgramId);
}