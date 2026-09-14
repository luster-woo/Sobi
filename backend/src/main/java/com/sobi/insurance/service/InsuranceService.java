package com.sobi.insurance.service;

import com.sobi.insurance.dto.InsuranceDetailResponse;
import com.sobi.insurance.dto.InsuranceListResponse;
import com.sobi.insurance.entity.InsuranceStatus;

public interface InsuranceService {

    InsuranceListResponse getChecklist(Long userId);

    InsuranceDetailResponse getDetail(Long userId, Long insuranceChecklistId);

    void changeStatus(Long userId, Long insuranceChecklistId, InsuranceStatus status);
}
