package com.sobi.business.service;

import com.sobi.business.dto.*;
import com.sobi.business.entity.BusinessInfo;
import com.sobi.business.entity.Verify;
import com.sobi.business.repository.BusinessReporitory;
import com.sobi.business.repository.VerifyRepository;
import com.sobi.common.entity.MinorCode;
import com.sobi.common.repository.MinorCodeRepository;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class BusinessServiceImpl implements BusinessService {

    private final VerifyRepository verifyRepository;
    private final BusinessReporitory businessReporitory;
    private final MinorCodeRepository minorCodeRepository;

    @Override
    public VerifyResponse verify(VerifyRequest request) {
        // 먼저 request.brn으로 verify 목록에서 찾고 일치하는 객체를 받아옴
        Verify verify = verifyRepository.findByBrn(request.getBrn()).orElseThrow(
                // 만약 객체가 null이면 business 에러 리턴
                () -> new BusinessException(ErrorCode.VERIFICATION_NOT_FOUND)
        );

        // 있으면 이름과 날짜 검증
        VerifyResponse verifyResponse = VerifyResponse.from(verify);

        if(!request.getName().equals(verify.getName()) || !request.getOpenDate().isEqual(verify.getOpenDate())) {
            throw new BusinessException(ErrorCode.BUSINESS_INFO_MISMATCH);
        }

        // VerifyResponse 리턴?
        return verifyResponse;
    }

    @Override
    public void business(BusinessRequest request, Long userId) {

        // 국세청 테이블에서 정보를 가져오고
        Verify verify = verifyRepository.findByBrn(request.getBrn()).orElseThrow(
                // 만약 객체가 null이면 business 에러 리턴
                () -> new BusinessException(ErrorCode.VERIFICATION_NOT_FOUND)
        );

        // 업종 코드 객체 생성
        MinorCode minorCode = minorCodeRepository
                .findById(verify.getBusinessCodeId())
                .orElseThrow(() ->
                        new BusinessException(ErrorCode.BUSINESS_CODE_NOT_FOUND)
                );

        // 비즈니스 인포 테이블에 채워넣기
        BusinessInfo businessInfo = BusinessInfo.builder()
                .userId(userId)
                .businessCode(minorCode)
                // 임시. 차후에 업종 코드 테이블 만들어지면 entity 내부 객체 변환후 국세청 더미데이터 추가후 변경해야함
//                .businessCode(1L)
                .brn(verify.getBrn())
                .businessName(verify.getBusinessName())
                .address(verify.getAddress())
                .region(verify.getRegion())
                .employeeCount(verify.getEmployeeCount())
                .openDate(verify.getOpenDate())
                .build();

        // 비즈니스 인포 테이블 저장
        businessReporitory.save(businessInfo);

    }


    @Override
    public BusinessInfoResponse businessInfo(Long userId) {

        // 리스트를 가져오고
        BusinessInfo businessInfo = businessReporitory.findByUserId(userId);

        // 만약 갯수가 0이면 비즈니스 에러
        if(businessInfo == null) {
            throw new BusinessException(ErrorCode.BUSINESS_INFO_NOT_FOUND);
        }

        // 리스트로 변경
//        List<BusinessInfoList> businessInfoList = new ArrayList<>();
//
//        for(BusinessInfo businessInfo : businessInfos) {
//            businessInfoList.add(BusinessInfoList.from(businessInfo));
//        }

        BusinessInfoResponse response = BusinessInfoResponse.from(businessInfo);

        return response;
    }
}
