package com.sobi.application.service;

import com.sobi.application.dto.ApplicationCreateResponse;
import com.sobi.application.dto.ApplicationDetailResponse;
import com.sobi.application.dto.ApplicationListResponse;

public interface ApplicationService {

    ApplicationCreateResponse create(Long userId, String type, Long programId);

    ApplicationDetailResponse getDetail(Long userId, Long applicationId);

    ApplicationListResponse getApplications(Long userId, String status);

    void cancel(Long userId, Long applicationId);
}
