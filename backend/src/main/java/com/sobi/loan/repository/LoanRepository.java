package com.sobi.loan.repository;

import com.sobi.loan.entity.Loan;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LoanRepository extends JpaRepository<Loan, Long> {

    @Override
    Optional<Loan> findById(Long aLong);
}
