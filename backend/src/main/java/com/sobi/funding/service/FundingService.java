package com.sobi.funding.service;



import com.sobi.business.entity.BusinessInfo;
import com.sobi.business.repository.BusinessReporitory;
import com.sobi.funding.domain.FundingCandidate;
import com.sobi.funding.domain.FundingCombination;
import com.sobi.funding.domain.FundingSourceType;
import com.sobi.funding.domain.FundingType;
import com.sobi.funding.dto.BatchItem;
import com.sobi.funding.dto.BatchRequest;
import com.sobi.funding.dto.FundingRecommendRequest;
import com.sobi.funding.dto.FundingRecommendResponse;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import com.sobi.loan.entity.Loan;
import com.sobi.loan.entity.SuggestLoan;
import com.sobi.loan.repository.SuggestLoanRepository;
import com.sobi.support.entity.SuggestSupportProgram;
import com.sobi.support.entity.SupportProgram;
import com.sobi.support.repository.SuggestSupportProgramRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FundingService {

    private final SuggestLoanRepository suggestLoanRepository;
    private final SuggestSupportProgramRepository suggestSupportProgramRepository;
    private final FundingRecommendationEngine recommendationEngine;
    private final BusinessReporitory businessReporitory;

    public void application(Long userId, BatchRequest batchRequest) {

        for (BatchItem batchItem : batchRequest.getItem()) {
            // 신청 메서드로 신청


        }

    }



    // 추천
    public FundingRecommendResponse recommend(Long userId, FundingRecommendRequest request) {


        BusinessInfo businessInfo = businessReporitory.findByUserId(userId);

        if (businessInfo == null) {
            throw new BusinessException(ErrorCode.BUSINESS_INFO_NOT_FOUND);
        }

        Long businessId = businessInfo.getId();


        Long targetAmount = request.getTargetAmount();


        if (targetAmount == null || targetAmount <= 0) {
            throw new BusinessException(ErrorCode.TARGET_AMOUNT_ERROR);
        }

        // 해당 사업자가 신청가능한 대출상품, 지원사업을 하나의 FundingCandidate으로 변경, 리스트 생성
        List<FundingCandidate> candidates = getFundingCandidates(businessId);

        // 해당 리스트 기반으로 추천 알고리즘 돌림
        // candidates가 비어있으면 비즈니스 에러를 발생시키는 것 보다는 빈 리스트를 내려주기로함.
        List<FundingCombination> combinations = recommendationEngine.recommend(candidates, targetAmount);

        return FundingRecommendResponse.from(
                targetAmount,
                combinations
        );
    }



    // 사업자 기반으로 추천 테이블들에 있는 대출 상품, 지원사업을 FundingCandidate 타입으로 변경후 하나의 리스트로 통합
    public List<FundingCandidate> getFundingCandidates(Long businessId) {

        List<FundingCandidate> candidates = new ArrayList<>();

        addLoanCandidates(businessId, candidates);

        addSupportProgramCandidates(businessId, candidates);

        return candidates;
    }

    // 대출 상품을 FundingCandidate로 변환 후 리스트에 추가
    private void addLoanCandidates(Long businessId, List<FundingCandidate> candidates) {

        List<SuggestLoan> suggestLoans = suggestLoanRepository.findAllWithLoanByBusinessId(businessId);

        for (SuggestLoan suggestLoan : suggestLoans) {

            Loan loan = suggestLoan.getLoan();

            FundingCandidate candidate =
                    new FundingCandidate(
                            loan.getId(),
                            FundingSourceType.LOAN_PRODUCT,
                            FundingType.LOAN,
                            loan.getAccountName(),
                            loan.getMinLoanBalance(),
                            loan.getMaxLoanBalance(),
                            BigDecimal.valueOf(
                                    loan.getInterestRate()
                            )
                    );

            candidates.add(candidate);
        }
    }

    // 지원 사업을 FundingCandidate로 변환후 리스트에 추가
    private void addSupportProgramCandidates(Long businessId, List<FundingCandidate> candidates) {

        List<SuggestSupportProgram> suggestPrograms = suggestSupportProgramRepository.findAllWithSupportProgramByBusinessId(businessId);

        for (SuggestSupportProgram suggest : suggestPrograms) {

            SupportProgram program = suggest.getSupportProgram();

            FundingCandidate candidate = convertSupportProgram(program);

            if (candidate != null) {
                candidates.add(candidate);
            }
        }
    }

    // 지원사업을 FundingCandidate로 변환
    private FundingCandidate convertSupportProgram(SupportProgram program) {

        FundingType fundingType;

        switch (program.getType()) {

            case "지원금" ->
                    fundingType = FundingType.GRANT;

            case "대출" ->
                    fundingType = FundingType.LOAN;

            default -> {
                // "기타" 유형은 자금 조합 추천 대상에서 제외
                return null;
            }
        }

        /*
         * 최대 지원/대출 가능 금액을 알 수 없으면
         * 목표 금액을 채울 수 있는지 계산할 수 없으므로 제외
         */
//        if (program.getMaxBalance() == null) {
//            return null;
//        }

        if (program.getMaxBalance() == null || program.getMaxBalance() <= 0) {
            return null;
        }

        long minAmount = program.getMinBalance() == null ? 0L : program.getMinBalance();

        if (minAmount < 0 || minAmount > program.getMaxBalance()) {
            return null;
        }


        BigDecimal interestRate;

        if (fundingType == FundingType.GRANT) {

            interestRate = BigDecimal.ZERO;

        } else {

            /*
             * 대출인데 금리가 없으면
             * 상환금액 계산이 불가능
             */
            if (program.getInterestRate() == null) {
                return null;
            }

            interestRate = BigDecimal.valueOf(program.getInterestRate());
        }

        return new FundingCandidate(
                program.getId(),
                FundingSourceType.SUPPORT_PROGRAM,
                fundingType,
                program.getPblancNm(),
                minAmount,
                program.getMaxBalance(),
                interestRate
        );
    }
}