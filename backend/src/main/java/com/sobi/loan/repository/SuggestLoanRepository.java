package com.sobi.loan.repository;



import com.sobi.loan.entity.Loan;
import com.sobi.loan.entity.SuggestLoan;
import com.sobi.loan.entity.SuggestLoanId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SuggestLoanRepository extends JpaRepository<SuggestLoan, SuggestLoanId> {

    @Query("""
            SELECT sl
            FROM SuggestLoan sl
            JOIN FETCH sl.loan
            WHERE sl.business.id = :businessId
            """)
    List<SuggestLoan> findAllWithLoanByBusinessId(
            @Param("businessId") Long businessId
    );

    /** 마이데이터 갱신 시 기존 추천을 비운다. 신용등급이 바뀌면 자격도 바뀐다. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM SuggestLoan sl WHERE sl.business.id = :businessId")
    void deleteAllByBusinessId(@Param("businessId") Long businessId);

    SuggestLoan findByBusinessIdAndLoan_Id(Long businessId, Long loanId);
}