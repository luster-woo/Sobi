package com.sobi.business.repository;

import com.sobi.business.entity.BusinessTax;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BusinessTaxRepository extends JpaRepository<BusinessTax, Long> {

    List<BusinessTax> findByBusinessIdOrderByPeriodAsc(Long businessId);

    /** 갱신 시 기존 매출을 지우고 다시 넣는다. */
    void deleteByBusinessId(Long businessId);
}