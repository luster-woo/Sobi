package com.sobi.business.repository;

import com.sobi.business.entity.BusinessInfo;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BusinessReporitory extends JpaRepository<BusinessInfo, Long> {

    BusinessInfo findByUserId(Long userId);



}
