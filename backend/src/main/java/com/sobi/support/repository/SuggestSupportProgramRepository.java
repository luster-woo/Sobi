package com.sobi.support.repository;


import com.sobi.support.entity.SuggestSupportProgram;
import com.sobi.support.entity.SuggestSupportProgramId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

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
}