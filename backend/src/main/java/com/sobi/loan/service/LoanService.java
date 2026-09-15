package com.sobi.loan.service;

import com.sobi.loan.dto.LoanDetailResponse;
import com.sobi.loan.dto.LoanListResponse;
import com.sobi.loan.dto.LoanSearchCondition;

public interface LoanService {

    LoanListResponse getLoans(Long userId, LoanSearchCondition condition);

    LoanDetailResponse getLoan(Long userId, Long loanId);
}
