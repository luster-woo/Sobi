package com.sobi.mydata.repository;

import com.sobi.mydata.entity.MydataTax;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MydataTaxRepository extends JpaRepository<MydataTax, Long> {

    /** 오래된 순. business_tax 로 그대로 옮긴다. */
    List<MydataTax> findByMydataIdOrderByPeriodAsc(Long mydataId);
}