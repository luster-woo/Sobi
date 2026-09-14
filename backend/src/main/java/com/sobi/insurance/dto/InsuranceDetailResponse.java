package com.sobi.insurance.dto;

import com.sobi.insurance.entity.InsuranceCategory;
import com.sobi.insurance.entity.InsuranceChecklist;
import com.sobi.insurance.entity.InsuranceStatus;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * status 를 함께 내린다. 상세 화면 하단의 '가입 필요 / 가입 제외' 버튼을 보여줄지 판단하는 데 필요
 */
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class InsuranceDetailResponse {

    private final Long insuranceChecklistId;
    private final String name;
    private final String info;
    private final String condition;
    private final InsuranceCategory category;
    private final InsuranceStatus status;

    public static InsuranceDetailResponse from(InsuranceChecklist checklist) {
        return new InsuranceDetailResponse(
                checklist.getId(),
                checklist.getInsurance().getName(),
                checklist.getInsurance().getInfo(),
                checklist.getInsurance().getCondition(),
                checklist.getInsurance().getCategory(),
                checklist.getStatus()
        );
    }
}
