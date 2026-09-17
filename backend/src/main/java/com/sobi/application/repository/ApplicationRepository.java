package com.sobi.application.repository;

import com.sobi.application.entity.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ApplicationRepository extends JpaRepository<Application, Long> {

    Application findByUser_IdAndSupportProgram_Id(Long userId, Long supportProgramId);

    Application findByUser_IdAndLoan_Id(Long userId, Long loanId);

    // 같은 상품에 반려 후 재신청하면 여러 건이 생기므로 가장 최근 신청 기준
    Optional<Application> findFirstByUser_IdAndLoan_IdOrderByIdDesc(Long userId, Long loanId);

    Optional<Application> findFirstByUser_IdAndSupportProgram_IdOrderByIdDesc(Long userId, Long supportProgramId);

    // 대출 상품 목록에서 상품별 최근 신청 상태를 한 번에 판단하기 위한 내 대출 신청 (최신순)
    List<Application> findAllByUser_IdAndLoanIsNotNullOrderByIdDesc(Long userId);

    // 신청 현황 목록. 상품명을 함께 쓰므로 대출 상품·지원사업을 한 번에 가져온다 (N+1 방지)
    @Query("""
            SELECT a
            FROM Application a
            LEFT JOIN FETCH a.loan
            LEFT JOIN FETCH a.supportProgram
            WHERE a.user.id = :userId
            ORDER BY a.id DESC
            """)
    List<Application> findAllWithProgramByUserId(@Param("userId") Long userId);

    // 내 신청만 조회 (남의 신청이면 없는 것으로 취급)
    Optional<Application> findByIdAndUser_Id(Long id, Long userId);

}
