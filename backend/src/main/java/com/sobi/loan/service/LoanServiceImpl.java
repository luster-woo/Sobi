package com.sobi.loan.service;

import com.sobi.application.entity.Application;
import com.sobi.application.repository.ApplicationRepository;
import com.sobi.bookmark.repository.BookmarkRepository;
import com.sobi.business.entity.BusinessInfo;
import com.sobi.business.repository.BusinessReporitory;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import com.sobi.loan.dto.*;
import com.sobi.loan.entity.Loan;
import com.sobi.loan.repository.LoanRepository;
import com.sobi.user.entity.User;
import com.sobi.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LoanServiceImpl implements LoanService {

    private final LoanRepository loanRepository;
    private final UserRepository userRepository;
    private final BusinessReporitory businessReporitory;
    private final BookmarkRepository bookmarkRepository;
    private final ApplicationRepository applicationRepository;
    private final LoanEligibilityChecker eligibilityChecker;

    /**
     * 판정이 사용자마다 달라 DB 에서 필터·정렬할 수 없으므로 전체 상품을 판정한 뒤 메모리에서 처리
     */
    @Override
    public LoanListResponse getLoans(Long userId, LoanSearchCondition condition) {

        // 판정 기준: 신용등급(users) + 업력·근로자 수(business_info, 예비창업자는 null)
        User user = findUser(userId);
        BusinessInfo business = businessReporitory.findByUserId(userId);

        // 상품마다 즐겨찾기·신청 조회를 하지 않도록 한 번에 가져온다
        Set<Long> bookmarkedLoanIds = new HashSet<>(bookmarkRepository.findLoanIdsByUserId(userId));
        Map<Long, Application> latestApplications = findLatestLoanApplications(userId);

        // 1. 신청 가능한 전체 상품의 상태 결정 (조건 판정 + 최근 신청)
        List<LoanSummaryResponse> all = loanRepository.findAllByAccountTypeUniqueNoIsNotNull().stream()
                .map(loan -> LoanSummaryResponse.of(
                        loan,
                        resolveStatus(
                                eligibilityChecker.check(loan, user.getCreditRating(), business),
                                latestApplications.get(loan.getId())
                        ),
                        bookmarkedLoanIds.contains(loan.getId())
                ))
                .toList();

        // 2. 검색 조건 필터 + 정렬
        List<LoanSummaryResponse> filtered = all.stream()
                .filter(loan -> matches(loan, condition))
                .sorted(comparator(condition.getSort()))
                .toList();

        // 개수는 필터 전 전체 기준
        return LoanListResponse.of(all, filtered);
    }

    /**
     * 대출 상세 조회. 상세는 불가 사유까지 내려준다
     */
    @Override
    public LoanDetailResponse getLoan(Long userId, Long loanId) {

        User user = findUser(userId);
        BusinessInfo business = businessReporitory.findByUserId(userId);

        // 금융망에 등록되지 않은 상품은 신청할 수 없으므로 없는 상품으로 취급
        Loan loan = loanRepository.findById(loanId)
                .filter(found -> found.getAccountTypeUniqueNo() != null)
                .orElseThrow(() -> new BusinessException(ErrorCode.LOAN_NOT_FOUND));

        EligibilityResult eligibilityResult = eligibilityChecker.check(loan, user.getCreditRating(), business);
        Application latestApplication =
                applicationRepository.findFirstByUser_IdAndLoan_IdOrderByIdDesc(userId, loanId).orElse(null);

        LoanStatus status = resolveStatus(eligibilityResult, latestApplication);

        return LoanDetailResponse.of(
                loan,
                eligibilityResult,
                status,
                // 진행 중인 신청이 있을 때만 [이어서 작성] 등으로 이동할 신청 id 를 내려준다
                status.isFromApplication() ? latestApplication.getId() : null,
                bookmarkRepository.existsByUser_IdAndLoan_Id(userId, loanId)
        );
    }

    // 최신순으로 받아 상품별 첫 번째(가장 최근) 신청만 남긴다
    private Map<Long, Application> findLatestLoanApplications(Long userId) {

        Map<Long, Application> latestApplications = new HashMap<>();

        for (Application application : applicationRepository.findAllByUser_IdAndLoanIsNotNullOrderByIdDesc(userId)) {
            latestApplications.putIfAbsent(application.getLoan().getId(), application);
        }
        return latestApplications;
    }

    // 최근 신청이 없거나 반려면 조건 판정, 그 외에는 신청 상태
    private LoanStatus resolveStatus(EligibilityResult eligibilityResult, Application latestApplication) {
        return LoanStatus.of(
                eligibilityResult.getEligibility(),
                latestApplication == null ? null : latestApplication.getStatus()
        );
    }

    // 인증 없이 호출되면 401 로 응답
    private User findUser(Long userId) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
    }

    // 검색 조건을 모두 만족하는지 확인. 값이 비어 있는 조건은 검사하지 않는다
    private boolean matches(LoanSummaryResponse loan, LoanSearchCondition condition) {

        // 검색어: 상품명 또는 은행명에 포함
        String keyword = condition.getKeyword();
        if (keyword != null && !keyword.isBlank()) {
            String trimmed = keyword.trim();
            if (!loan.getAccountName().contains(trimmed) && !loan.getBankName().contains(trimmed)) {
                return false;
            }
        }

        // 취급 기관: 은행명 일치
        if (condition.getBankName() != null && !condition.getBankName().isBlank()
                && !loan.getBankName().equals(condition.getBankName())) {
            return false;
        }

        // 상태: 가능 / 불가 / 작성중 / 신청완료 / 심사중 / 승인 / 지급 완료
        if (condition.getStatus() != null && loan.getStatus() != condition.getStatus()) {
            return false;
        }

        // 즐겨찾기만: bookmarked=true 일 때만 걸러낸다
        return !condition.isBookmarked() || loan.isBookmarked();
    }

    // 불가 상품을 뒤로 보낸 뒤 정렬 기준을 적용하고, 같으면 다른 기준으로 한 번 더 정렬해 순서를 고정한다
    private Comparator<LoanSummaryResponse> comparator(LoanSortType sort) {

        // 불가만 뒤로 보낸다. 작성중·심사중 등 신청 진행 상품은 가능 상품과 함께 앞에 둔다
        Comparator<LoanSummaryResponse> ineligibleLast =
                Comparator.comparing(loan -> loan.getStatus() == LoanStatus.INELIGIBLE);
        Comparator<LoanSummaryResponse> byRate =
                Comparator.comparing(LoanSummaryResponse::getInterestRate);
        Comparator<LoanSummaryResponse> byMaxBalanceDesc =
                Comparator.comparing(LoanSummaryResponse::getMaxLoanBalance).reversed();

        // 한도 높은 순 (한도가 같으면 금리 낮은 순)
        if (sort == LoanSortType.MAX_BALANCE) {
            return ineligibleLast.thenComparing(byMaxBalanceDesc).thenComparing(byRate);
        }
        // 기본: 금리 낮은 순 (금리가 같으면 한도 높은 순). sort 파라미터가 null 이어도 여기로 온다
        return ineligibleLast.thenComparing(byRate).thenComparing(byMaxBalanceDesc);
    }
}
