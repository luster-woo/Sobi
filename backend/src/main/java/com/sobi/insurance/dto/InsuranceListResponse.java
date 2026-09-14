package com.sobi.insurance.dto;

import com.sobi.insurance.entity.InsuranceChecklist;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;


@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class InsuranceListResponse {

    private final List<InsuranceItemResponse> insurances;

    public static InsuranceListResponse from(List<InsuranceChecklist> checklists) {
        return new InsuranceListResponse(
                checklists.stream()
                        .map(InsuranceItemResponse::from)
                        .toList()
        );
    }
}
