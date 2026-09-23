package com.sobi.dashboard.service;

import com.sobi.business.entity.BusinessInfo;
import com.sobi.business.entity.BusinessTax;
import com.sobi.business.repository.BusinessReporitory;
import com.sobi.business.repository.BusinessTaxRepository;
import com.sobi.dashboard.dto.DashboardResponse;
import com.sobi.dashboard.dto.DashboardResponse.*;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import com.sobi.insurance.repository.InsuranceChecklistRepository;
import com.sobi.insurance.entity.InsuranceChecklist;
import com.sobi.loan.entity.Loan;
import com.sobi.loan.entity.SuggestLoan;
import com.sobi.loan.repository.LoanRepository;
import com.sobi.loan.repository.SuggestLoanRepository;
import com.sobi.support.entity.SupportProgram;
import com.sobi.support.entity.SuggestSupportProgram;
import com.sobi.support.repository.SupportProgramRepository;
import com.sobi.support.repository.SuggestSupportProgramRepository;
import com.sobi.user.entity.Role;
import com.sobi.user.entity.User;
import com.sobi.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {

    private final UserRepository userRepository;
    private final BusinessReporitory businessRepository;
    private final BusinessTaxRepository businessTaxRepository;
    private final InsuranceChecklistRepository insuranceChecklistRepository;
    private final LoanRepository loanRepository;
    private final SuggestLoanRepository suggestLoanRepository;
    private final SupportProgramRepository supportProgramRepository;
    private final SuggestSupportProgramRepository suggestSupportProgramRepository;
    private final DashboardRepaymentService repaymentService;

    @Override
    public DashboardResponse getDashboard(Long userId) {

        // 토큰에서 가져온 userId로 사용자 조회
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        User user = userRepository.findById(userId).orElseThrow(
                () -> new BusinessException(ErrorCode.NO_USER)
        );

        if (user.getDeletedAt() != null) {
            throw new BusinessException(ErrorCode.NO_USER);
        }

        if (user.getRole() == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
        }

        // DB에 저장된 현재 role로 예비 창업자, 사업자 구분
        BusinessInfo businessInfo = businessRepository.findByUserId(userId);

        if (user.getRole() == Role.PREENTREPRENEUR) {
            return getPreEntrepreneurDashboard(businessInfo);
        }

        if (businessInfo == null) {
            throw new BusinessException(ErrorCode.BUSINESS_INFO_NOT_FOUND);
        }

        return getEntrepreneurDashboard(user, businessInfo);
    }

    // 예비 창업자 대시보드
    private PreEntrepreneur getPreEntrepreneurDashboard(BusinessInfo businessInfo) {

        // 전체 대출 상품 조회 후 응답 리스트 생성
        List<Loan> loans = loanRepository.findAll(Sort.by("id"));
        List<LoanItem> loanList = new ArrayList<>();

        for (Loan loan : loans) {
            loanList.add(LoanItem.from(loan));
        }

        // 전체 지원사업 조회 후 응답 리스트 생성
        List<SupportProgram> supportPrograms = supportProgramRepository.findAll(Sort.by("id"));
        List<SupportItem> supportProgramList = new ArrayList<>();

        for (SupportProgram supportProgram : supportPrograms) {
            supportProgramList.add(SupportItem.from(supportProgram));
        }

        List<Insurance> insuranceList = getInsurances(businessInfo);

        PreEntrepreneur response = new PreEntrepreneur(
                insuranceList,
                loanList,
                supportProgramList
        );

        return response;
    }

    // 사업자 대시보드
    private Entrepreneur getEntrepreneurDashboard(User user, BusinessInfo businessInfo) {

        Long businessId = businessInfo.getId();
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));

        // 최근 매출 내역과 가장 최근 월 매출
        List<Sales> recentSalesHistory = getRecentSalesHistory(businessId);
        long latestMonthlySales = 0L;

        if (!recentSalesHistory.isEmpty()) {
            latestMonthlySales = recentSalesHistory.getLast().revenue();
        }

        // 추천 대출 조회 후 응답 리스트 생성
        List<SuggestLoan> suggestLoans = suggestLoanRepository.findAllWithLoanByBusinessId(businessId);
        List<LoanItem> suggestLoanList = new ArrayList<>();

        for (SuggestLoan suggestLoan : suggestLoans) {
            suggestLoanList.add(LoanItem.from(suggestLoan.getLoan()));
        }

        suggestLoanList.sort(Comparator.comparing(LoanItem::loanId));

        // 자격 판정 status와 무관하게 해당 사업자의 추천 행 전체 조회
        List<SuggestSupportProgram> suggestSupportPrograms =
                suggestSupportProgramRepository.findAllWithSupportProgramByBusinessId(businessId);
        List<SupportItem> suggestSupportProgramList = new ArrayList<>();

        for (SuggestSupportProgram suggestSupportProgram : suggestSupportPrograms) {
            SupportProgram supportProgram = suggestSupportProgram.getSupportProgram();
            suggestSupportProgramList.add(SupportItem.from(supportProgram));
        }

        suggestSupportProgramList.sort(Comparator.comparing(SupportItem::supportProgramId));

        // 지원사업 개수와 금융망 상환 정보 조회
        SupportSummary supportProgramSummary = getSupportProgramSummary(suggestSupportProgramList, today);
        RepaymentManagement repaymentManagement = repaymentService.getSummary(user.getUserKey(), today);
        List<Insurance> insuranceList = getInsurances(businessInfo);

        // 응답 생성
        Entrepreneur response = new Entrepreneur(
                recentSalesHistory,
                latestMonthlySales,
                repaymentManagement.totalLoanBalance(),
                insuranceList,
                supportProgramSummary,
                repaymentManagement,
                suggestLoanList,
                suggestSupportProgramList
        );

        return response;
    }

    // 최신 매출 6건을 오래된 순서대로 반환
    private List<Sales> getRecentSalesHistory(Long businessId) {

        List<BusinessTax> businessTaxes = new ArrayList<>(
                businessTaxRepository.findTop6ByBusinessIdOrderByPeriodDesc(businessId)
        );
        businessTaxes.sort(Comparator.comparing(BusinessTax::getPeriod));

        List<Sales> recentSalesHistory = new ArrayList<>();

        for (BusinessTax businessTax : businessTaxes) {
            String period = YearMonth.from(businessTax.getPeriod()).toString();
            Sales sales = new Sales(period, businessTax.getRevenue());
            recentSalesHistory.add(sales);
        }

        return recentSalesHistory;
    }

    // 지원사업 개수 계산
    private SupportSummary getSupportProgramSummary(List<SupportItem> supportPrograms, LocalDate today) {

        long availableCount = supportPrograms.size();
        long totalCount = supportProgramRepository.count();
        long unavailableCount = totalCount - availableCount;
        long imminentCount = 0L;
        LocalDate oneWeekLater = today.plusDays(7);

        for (SupportItem supportProgram : supportPrograms) {
            LocalDate endDate = supportProgram.endDate();

            if (endDate == null || endDate.isBefore(today) || endDate.isAfter(oneWeekLater)) {
                continue;
            }

            imminentCount++;
        }

        return new SupportSummary(availableCount, imminentCount, unavailableCount, totalCount);
    }

    // 사업자 정보가 없는 예비 창업자는 빈 보험 목록 반환
    private List<Insurance> getInsurances(BusinessInfo businessInfo) {

        if (businessInfo == null) {
            return List.of();
        }

        List<InsuranceChecklist> insuranceChecklists =
                insuranceChecklistRepository.findAllByBusinessId(businessInfo.getId());
        List<Insurance> insuranceList = new ArrayList<>();

        for (InsuranceChecklist insuranceChecklist : insuranceChecklists) {
            insuranceList.add(Insurance.from(insuranceChecklist));
        }

        return insuranceList;
    }
}
