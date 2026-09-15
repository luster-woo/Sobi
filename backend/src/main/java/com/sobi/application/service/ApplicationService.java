package com.sobi.application.service;

import com.sobi.application.dto.ApplicationCreateResponse;
import com.sobi.application.dto.ApplicationDetailResponse;

public interface ApplicationService {

    ApplicationCreateResponse create(Long userId, String type, Long programId);

    ApplicationDetailResponse getDetail(Long userId, Long applicationId);
}
