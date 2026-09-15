package com.sobi.application.repository;

import com.sobi.application.entity.ApplicationDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ApplicationDocumentRepository extends JpaRepository<ApplicationDocument, Long> {

    // 서류 이름을 함께 쓰므로 대출·지원사업 필수 서류를 한 번에 가져온다
    @Query("""
            SELECT ad
            FROM ApplicationDocument ad
            LEFT JOIN FETCH ad.loanDocument
            LEFT JOIN FETCH ad.programDocument
            WHERE ad.application.id = :applicationId
            ORDER BY ad.id
            """)
    List<ApplicationDocument> findAllWithRequiredDocumentByApplicationId(
            @Param("applicationId") Long applicationId
    );
}
