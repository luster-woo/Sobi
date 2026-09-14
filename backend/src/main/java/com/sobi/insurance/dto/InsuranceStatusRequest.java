package com.sobi.insurance.dto;

import com.sobi.insurance.entity.InsuranceStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class InsuranceStatusRequest {

    /** REQUIRED 또는 EXEMPT 만 허용 */
    @NotNull
    private InsuranceStatus status;
}
