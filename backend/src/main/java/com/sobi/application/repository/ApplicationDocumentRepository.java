package com.sobi.application.repository;

import com.sobi.application.entity.ApplicationDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

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

    // 업로드 권한 확인(신청자)과 AI 검증 요청(서류명·신청자)에 쓰는 값을 한 번에 가져온다
    @Query("""
            SELECT ad
            FROM ApplicationDocument ad
            JOIN FETCH ad.application a
            JOIN FETCH a.user
            LEFT JOIN FETCH ad.loanDocument
            LEFT JOIN FETCH ad.programDocument
            WHERE ad.id = :id
            """)
    Optional<ApplicationDocument> findWithApplicationAndRequiredDocumentById(@Param("id") Long id);

    /**
     * 검증 상태를 조건부로 바꾼다. 바뀐 행 수를 돌려준다 (0 이면 조건 불일치).
     *
     * 파일 경로(storedPath)와 현재 상태(from)가 모두 맞을 때만 바꾸므로,
     * 검증 도중 재업로드(경로 변경)나 시간 초과 정리(FAILED)가 먼저 일어나면 늦게 온 결과가 덮어쓰지 않는다.
     */
    @Transactional
    @Modifying(clearAutomatically = true)
    @Query("""
            UPDATE ApplicationDocument ad
            SET ad.validationStatus = :to,
                ad.validationMessage = :message,
                ad.updatedAt = :now
            WHERE ad.id = :id
              AND ad.storedPath = :storedPath
              AND ad.validationStatus = :from
            """)
    int transitionValidation(
            @Param("id") Long id,
            @Param("storedPath") String storedPath,
            @Param("from") String from,
            @Param("to") String to,
            @Param("message") String message,
            @Param("now") LocalDateTime now
    );

    // 대기·진행 상태로 오래 멈춘 서류를 실패 처리한다 (AI 장애, 처리 전 서버 재시작 등)
    @Transactional
    @Modifying(clearAutomatically = true)
    @Query("""
            UPDATE ApplicationDocument ad
            SET ad.validationStatus = :to,
                ad.validationMessage = :message,
                ad.updatedAt = :now
            WHERE ad.validationStatus IN :statuses
              AND ad.updatedAt < :threshold
            """)
    int expireStaleValidations(
            @Param("statuses") Collection<String> statuses,
            @Param("to") String to,
            @Param("message") String message,
            @Param("threshold") LocalDateTime threshold,
            @Param("now") LocalDateTime now
    );
}
