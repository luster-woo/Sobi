package com.sobi.insurance.dto;

import com.sobi.insurance.entity.InsuranceCategory;
import com.sobi.insurance.entity.InsuranceChecklist;
import com.sobi.insurance.entity.InsuranceStatus;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class InsuranceItemResponse {

    private final Long insuranceChecklistId;
    private final Long insuranceId;
    private final String name;
    private final String info;
    private final InsuranceCategory category;
    private final InsuranceStatus status;

    public static InsuranceItemResponse from(InsuranceChecklist checklist) {
        return new InsuranceItemResponse(
                checklist.getId(),
                checklist.getInsurance().getId(),
                checklist.getInsurance().getName(),
                checklist.getInsurance().getInfo(),
                checklist.getInsurance().getCategory(),
                checklist.getStatus()
        );
    }
}
