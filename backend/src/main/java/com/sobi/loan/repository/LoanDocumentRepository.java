package com.sobi.loan.repository;

import com.sobi.loan.entity.LoanDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LoanDocumentRepository extends JpaRepository<LoanDocument, Long> {

    // 정렬 컬럼이 없어 id 순서가 곧 화면 순서
    List<LoanDocument> findAllByLoan_IdOrderByIdAsc(Long loanId);
}
