package com.sobi.insurance.service;

import com.sobi.business.entity.BusinessInfo;
import com.sobi.business.repository.BusinessReporitory;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import com.sobi.insurance.dto.InsuranceDetailResponse;
import com.sobi.insurance.dto.InsuranceListResponse;
import com.sobi.insurance.entity.InsuranceChecklist;
import com.sobi.insurance.entity.InsuranceStatus;
import com.sobi.insurance.repository.InsuranceChecklistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InsuranceServiceImpl implements InsuranceService {

    private final InsuranceChecklistRepository insuranceChecklistRepository;
    private final BusinessReporitory businessReporitory;

    /**
     * 체크리스트는 마이데이터 연동 시점에 채워진다.
     * 업체가 없으면(예비창업자) 의무보험 대상 자체가 아니다.
     */
    @Override
    public InsuranceListResponse getChecklist(Long userId) {

        BusinessInfo business = businessReporitory.findByUserId(userId);

        if (business == null) {
            throw new BusinessException(ErrorCode.BUSINESS_INFO_NOT_FOUND);
        }

        List<InsuranceChecklist> checklists =
                insuranceChecklistRepository.findAllByBusinessId(business.getId());

        return InsuranceListResponse.from(checklists);
    }

    @Override
    public InsuranceDetailResponse getDetail(Long userId, Long insuranceChecklistId) {
        return InsuranceDetailResponse.from(findMine(userId, insuranceChecklistId));
    }

    /**
     * 사용자가 '확인 필요' 항목을 판단한 결과를 반영
     *
     * 가입 완료는 마이데이터가 결정하므로 사용자가 되돌릴 수 없고,
     * 이미 가입 필요/가입 제외를 고른 항목도 다시 바꿀 수 없다.
     */
    @Override
    @Transactional
    public void changeStatus(Long userId, Long insuranceChecklistId, InsuranceStatus status) {

        if (!status.isUserSelectable()) {
            throw new BusinessException(ErrorCode.INSURANCE_STATUS_NOT_ALLOWED);
        }

        InsuranceChecklist checklist = findMine(userId, insuranceChecklistId);

        if (checklist.getStatus() != InsuranceStatus.NEEDS_VERIFICATION) {
            throw new BusinessException(ErrorCode.INSURANCE_STATUS_NOT_CHANGEABLE);
        }

        checklist.changeStatus(status);
    }

    /**
     * 내 체크리스트 1건을 가져오고, 없거나 남의 것이면 404
     */
    private InsuranceChecklist findMine(Long userId, Long insuranceChecklistId) {
        return insuranceChecklistRepository
                .findByIdAndUserId(insuranceChecklistId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.INSURANCE_CHECKLIST_NOT_FOUND));
    }
}
