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

    // 금융망에 등록되어 신청 가능한 상품
    List<Loan> findAllByAccountTypeUniqueNoIsNotNull();

    // 금융망 대출 계좌는 상품명에 은행명이 섞여 있고 bankName 필드 X
    // 상품 고유번호로 우리 상품을 찾아 은행명을 가져옴
    Optional<Loan> findByAccountTypeUniqueNo(String accountTypeUniqueNo);
}