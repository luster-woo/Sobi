package com.sobi.loan.repository;



import com.sobi.loan.entity.Loan;
import com.sobi.loan.entity.SuggestLoan;
import com.sobi.loan.entity.SuggestLoanId;
import org.springframework.data.jpa.repository.JpaRepository;
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

    SuggestLoan findByBusinessIdAndLoan_Id(Long businessId, Long loanId);
}