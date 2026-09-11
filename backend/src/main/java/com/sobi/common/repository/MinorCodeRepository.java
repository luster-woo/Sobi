package com.sobi.common.repository;

import com.sobi.common.entity.MinorCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface MinorCodeRepository extends JpaRepository<MinorCode, Long> {

    /** 업종 목록 트리 조립용. 100행이라 한 번에 읽고 fetch join 으로 N+1 만 막는다 */
    @Query("""
            SELECT m
            FROM MinorCode m
            JOIN FETCH m.subCode s
            JOIN FETCH s.majorCode j
            ORDER BY j.code, s.code, m.code
            """)
    List<MinorCode> findAllWithHierarchy();
}
