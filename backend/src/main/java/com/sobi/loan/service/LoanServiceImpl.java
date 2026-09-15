package com.sobi.loan.service;

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

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LoanServiceImpl implements LoanService {

    private final LoanRepository loanRepository;
    private final UserRepository userRepository;
    private final BusinessReporitory businessReporitory;
    private final BookmarkRepository bookmarkRepository;
    private final LoanEligibilityChecker eligibilityChecker;

    /**
     * 판정이 사용자마다 달라 DB 에서 필터·정렬할 수 없으므로 전체 상품을 판정한 뒤 메모리에서 처리
     */
    @Override
    public LoanListResponse getLoans(Long userId, LoanSearchCondition condition) {

        // 판정 기준: 신용등급(users) + 업력·근로자 수(business_info, 예비창업자는 null)
        User user = findUser(userId);
        BusinessInfo business = businessReporitory.findByUserId(userId);

        // 상품마다 즐겨찾기 조회를 하지 않도록 한 번에 가져온다
        Set<Long> bookmarkedLoanIds = new HashSet<>(bookmarkRepository.findLoanIdsByUserId(userId));

        // 1. 신청 가능한 전체 상품을 판정(가능/불가능)
        List<LoanSummaryResponse> all = loanRepository.findAllByAccountTypeUniqueNoIsNotNull().stream()
                .map(loan -> LoanSummaryResponse.of(
                        loan,
                        eligibilityChecker.check(loan, user.getCreditRating(), business).getEligibility(),
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

        return LoanDetailResponse.of(
                loan,
                eligibilityChecker.check(loan, user.getCreditRating(), business),
                bookmarkRepository.existsByUser_IdAndLoan_Id(userId, loanId)
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

        // 판정 결과: 가능 / 불가
        if (condition.getEligibility() != null && loan.getEligibility() != condition.getEligibility()) {
            return false;
        }

        // 즐겨찾기만: bookmarked=true 일 때만 걸러낸다
        return !condition.isBookmarked() || loan.isBookmarked();
    }

    // 1차 정렬이 같으면 다른 기준으로 한 번 더 정렬
    private Comparator<LoanSummaryResponse> comparator(LoanSortType sort) {

        Comparator<LoanSummaryResponse> byRate =
                Comparator.comparing(LoanSummaryResponse::getInterestRate);
        Comparator<LoanSummaryResponse> byMaxBalanceDesc =
                Comparator.comparing(LoanSummaryResponse::getMaxLoanBalance).reversed();

        // 한도 높은 순 (한도가 같으면 금리 낮은 순)
        if (sort == LoanSortType.MAX_BALANCE) {
            return byMaxBalanceDesc.thenComparing(byRate);
        }
        // 기본: 금리 낮은 순 (금리가 같으면 한도 높은 순)
        return byRate.thenComparing(byMaxBalanceDesc);
    }
}
