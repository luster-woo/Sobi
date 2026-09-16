package com.sobi.mydata.repository;

import com.sobi.mydata.entity.MydataInsurance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MydataInsuranceRepository extends JpaRepository<MydataInsurance, Long> {

    /** 체크리스트를 만들 때 Insurance 까지 필요하므로 fetch join 한다. */
    @Query("""
            SELECT mi FROM MydataInsurance mi
            JOIN FETCH mi.insurance
            WHERE mi.mydata.id = :mydataId
            """)
    List<MydataInsurance> findAllByMydataId(@Param("mydataId") Long mydataId);
}