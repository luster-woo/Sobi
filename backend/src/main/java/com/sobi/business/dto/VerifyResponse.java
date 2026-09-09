package com.sobi.business.dto;

import com.sobi.business.entity.Verify;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VerifyResponse {

    private String type;
    private String businessType;
    private String businessName;
    private String address;
    private Boolean isClose;
    private LocalDate openDate;

    public static VerifyResponse from(Verify verify) {
        return VerifyResponse.builder()
                .type(verify.getType())
                .businessType(verify.getBusinessCodeName())
                .businessName(verify.getBusinessName())
                .address(verify.getAddress())
                .isClose(verify.isClose())
                .openDate(verify.getOpenDate())
                .build();
    }


}
