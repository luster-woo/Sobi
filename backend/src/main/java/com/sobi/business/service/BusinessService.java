package com.sobi.business.service;

import com.sobi.business.dto.*;

public interface BusinessService {

    VerifyResponse verify(VerifyRequest request);

    void business(BusinessRequest request, Long userId);

    BusinessInfoResponse businessInfo(Long userId);

}
