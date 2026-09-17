package com.sobi.business.repository;

import com.sobi.business.entity.BusinessInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface BusinessReporitory extends JpaRepository<BusinessInfo, Long> {

    BusinessInfo findByUserId(Long userId);

    /**
     * 업종명까지 함께. 마이페이지가 minor_code.name 을 쓰는데
     * 지연 로딩을 트랜잭션 밖에서 건드리지 않으려고 fetch join 한다.
     */
    @Query("""
            SELECT b FROM BusinessInfo b
            JOIN FETCH b.businessCode
            WHERE b.user.id = :userId
            """)
    Optional<BusinessInfo> findWithBusinessCodeByUserId(@Param("userId") Long userId);

}
