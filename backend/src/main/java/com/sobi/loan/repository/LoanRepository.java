package com.sobi.loan.repository;

import com.sobi.loan.entity.Loan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LoanRepository extends JpaRepository<Loan, Long> {

    @Override
    Optional<Loan> findById(Long aLong);

    // 금융망에 아직 등록되지 않은 상품
    List<Loan> findAllByAccountTypeUniqueNoIsNull();
}