package com.sobi.business.dto;


import com.sobi.business.entity.BusinessInfo;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@Builder
public class BusinessInfoResponse {

    private String businessName;

    private String bsn;

    private String name;

    private String businessType;

    private String address;

    private LocalDate openDate;

    public static BusinessInfoResponse from(BusinessInfo businessInfo) {
        return BusinessInfoResponse.builder()
                .businessName(businessInfo.getBusinessName())
                .bsn(businessInfo.getBrn())
                .name(businessInfo.getBusinessName())
                .businessType(businessInfo.getBusinessCode().getName())
                .address(businessInfo.getAddress())
                .openDate(businessInfo.getOpenDate())
                .build();
    }

}

