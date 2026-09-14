package com.sobi.loan.repository;

import com.sobi.loan.entity.Loan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LoanRepository extends JpaRepository<Loan, Long> {

    // 금융망에 아직 등록되지 않은 상품
    List<Loan> findAllByAccountTypeUniqueNoIsNull();
}
