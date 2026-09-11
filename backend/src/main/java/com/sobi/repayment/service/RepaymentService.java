package com.sobi.repayment.service;

import com.sobi.repayment.dto.LoanListResponse;
import com.sobi.repayment.dto.RecordRequest;
import com.sobi.repayment.dto.RecordResponse;

public interface RepaymentService {

    LoanListResponse getList(Long userId);

    RecordResponse getRecord(Long userId, RecordRequest request);

}
