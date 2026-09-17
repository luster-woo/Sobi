package com.sobi.user.service;

import com.sobi.auth.repository.RefreshTokenRepository;
import com.sobi.business.entity.BusinessInfo;
import com.sobi.business.repository.BusinessReporitory;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import com.sobi.repayment.client.SsafyRepaymentClient;
import com.sobi.repayment.clientDto.SsafyInquireLoanAccountDetail;
import com.sobi.support.repository.SuggestSupportProgramRepository;
import com.sobi.user.client.SsafyUserClient;
import com.sobi.user.clientDto.SsafyDemandDepositAccountRecord;
import com.sobi.user.dto.*;
import com.sobi.user.entity.Provider;
import com.sobi.user.entity.User;
import com.sobi.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenRepository refreshTokenRepository;
    private final BusinessReporitory businessReporitory;
    private final SuggestSupportProgramRepository suggestSupportProgramRepository;
    private final SsafyUserClient ssafyUserClient;
    private final SsafyRepaymentClient ssafyRepaymentClient;

    @Override
    @Transactional
    public NotificationResponse toggleNotification(Long userId) {
        User user = userRepository.findById(userId)
                .filter(u -> u.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException(ErrorCode.NO_USER));

        return new NotificationResponse(user.toggleNotification());
    }

    @Override
    @Transactional
    public void changePassword(Long userId, PasswordChangeReqeust request) {

        User user = userRepository.findById(userId)
                .filter(u -> u.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException(ErrorCode.NO_USER));

        if (user.getProvider() != Provider.LOCAL) {
            throw new BusinessException(ErrorCode.LOCAL_LOGIN_ONLY);
        }

        user.updatePassword(passwordEncoder.encode(request.getPassword()));
    }

    @Override
    @Transactional
    public void withdraw(Long userId) {

        User user = userRepository.findById(userId)
                .filter(u -> u.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException(ErrorCode.NO_USER));

        user.withdraw();
        refreshTokenRepository.delete(userId);      // 세션 무효화
    }

    @Override
    @Transactional
    public BirthDateResponse updateBirthDate(Long userId, BirthDateRequest request) {
        User user = userRepository.findById(userId)
                .filter(u -> u.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException(ErrorCode.NO_USER));

        user.updateBirthDate(request.getBirthDate());

        return new BirthDateResponse(user.getBirthDate());
    }

    @Override
    @Transactional(readOnly = true)
    public UserMeResponse getMe(Long userId) {

        User user = userRepository.findById(userId)
                .filter(found -> found.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException(ErrorCode.NO_USER));

        return UserMeResponse.from(user);
    }

    /**
     * 마이페이지.
     *
     * @Transactional 을 붙이지 않는다. 금융망 호출 둘이 1~2초 걸리는데
     * 트랜잭션 안에 두면 그동안 커넥션을 붙들게 된다.
     * 업종명은 fetch join 으로 미리 가져와 지연 로딩을 건드리지 않는다.
     */
    @Override
    public MyPageResponse getMyPage(Long userId) {

        User user = userRepository.findById(userId)
                .filter(found -> found.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException(ErrorCode.NO_USER));

        // 예비창업자는 사업자 정보가 없다
        BusinessInfo business = businessReporitory.findWithBusinessCodeByUserId(userId).orElse(null);

        List<SsafyDemandDepositAccountRecord> deposits = fetchDepositAccounts(user.getUserKey());
        List<SsafyInquireLoanAccountDetail> loans = fetchLoanAccounts(user.getUserKey());

        return MyPageResponse.of(
                user,
                business == null ? null : MyPageResponse.BusinessSummary.of(business, user.getName()),
                toMyDataStatus(business),
                toAccountSummary(deposits, loans),
                toPayoutAccount(deposits, loans)
        );
    }

    private MyPageResponse.MyDataStatus toMyDataStatus(BusinessInfo business) {

        LocalDateTime updatedAt = business == null
                ? null
                : suggestSupportProgramRepository.findLastJudgedAt(business.getId()).orElse(null);

        return MyPageResponse.MyDataStatus.builder()
                .linked(updatedAt != null)
                .updatedAt(updatedAt)
                .build();
    }

    private MyPageResponse.AccountSummary toAccountSummary(
            List<SsafyDemandDepositAccountRecord> deposits,
            List<SsafyInquireLoanAccountDetail> loans
    ) {
        long totalBalance = deposits.stream()
                .mapToLong(account -> parseAmount(account.getAccountBalance()))
                .sum();

        long totalLoanBalance = loans.stream()
                .mapToLong(account -> parseAmount(account.getLoanBalance()))
                .sum();

        int institutionCount = (int) deposits.stream()
                .map(SsafyDemandDepositAccountRecord::getBankName)
                .filter(Objects::nonNull)
                .distinct()
                .count();

        return MyPageResponse.AccountSummary.builder()
                .totalBalance(totalBalance)
                .totalLoanBalance(totalLoanBalance)
                .accountCount(deposits.size() + loans.size())
                .institutionCount(institutionCount)
                .build();
    }

    /** 가장 최근 대출의 출금 계좌. 대출이 없거나 그 계좌를 못 찾으면 null */
    private MyPageResponse.PayoutAccount toPayoutAccount(
            List<SsafyDemandDepositAccountRecord> deposits,
            List<SsafyInquireLoanAccountDetail> loans
    ) {
        return loans.stream()
                .max(Comparator.comparing(
                        SsafyInquireLoanAccountDetail::getLoanDate,
                        Comparator.nullsFirst(Comparator.naturalOrder())))
                .map(SsafyInquireLoanAccountDetail::getWithdrawalAccountNo)
                .flatMap(accountNo -> deposits.stream()
                        .filter(deposit -> Objects.equals(deposit.getAccountNo(), accountNo))
                        .findFirst())
                .map(deposit -> MyPageResponse.PayoutAccount.builder()
                        .bankName(deposit.getBankName())
                        .accountNo(deposit.getAccountNo())
                        .build())
                .orElse(null);
    }

    /**
     * 금융망이 실패해도 마이페이지는 뜬다. 계좌 요약만 0 으로 나간다.
     * 화면 전체가 안 보이는 것보다 낫다.
     */
    private List<SsafyDemandDepositAccountRecord> fetchDepositAccounts(String userKey) {
        try {
            return ssafyUserClient.inquireDemandDepositAccountList(userKey).getRec();
        } catch (RuntimeException e) {
            log.warn("금융망 입출금 계좌 조회 실패", e);
            return List.of();
        }
    }

    private List<SsafyInquireLoanAccountDetail> fetchLoanAccounts(String userKey) {
        try {
            return ssafyRepaymentClient.inquireLoanAccountList(userKey).getDetails();
        } catch (RuntimeException e) {
            log.warn("금융망 대출 계좌 조회 실패", e);
            return List.of();
        }
    }

    /** 금융망은 금액도 문자열로 준다 */
    private long parseAmount(String value) {
        try {
            return value == null ? 0L : Long.parseLong(value.trim());
        } catch (NumberFormatException e) {
            return 0L;
        }
    }
}