package com.sobi.dashboard.service;

import com.sobi.dashboard.dto.DashboardResponse.RepaymentManagement;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import com.sobi.repayment.client.SsafyRepaymentClient;
import com.sobi.repayment.clientDto.RepaymentRecordList;
import com.sobi.repayment.clientDto.SsafyInquireLoanAccountDetail;
import com.sobi.repayment.clientDto.SsafyRepaymentRecord;
import com.sobi.repayment.clientDto.SsafyInquireLoanAccountListResponse;
import com.sobi.repayment.clientDto.SsafyInquireRepaymentRecordsResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardRepaymentService {

    private final SsafyRepaymentClient repaymentClient;

    public RepaymentManagement getSummary(String userKey, LocalDate today) {

        try {

            // 금융망에서 대출 가입 목록 조회
            SsafyInquireLoanAccountListResponse ssafyResponseList =
                    repaymentClient.inquireLoanAccountList(userKey);
            List<SsafyInquireLoanAccountDetail> loanAccounts = ssafyResponseList.getDetails();

            if (loanAccounts == null) {
                throw new IllegalStateException("금융망 대출 목록 REC 누락");
            }

            long totalLoanBalance = 0L;
            long thisMonthRepaymentAmount = 0L;
            LocalDate nextRepaymentDate = null;

            for (SsafyInquireLoanAccountDetail loanAccount : loanAccounts) {

                // 계좌별 상환 내역 조회
                SsafyInquireRepaymentRecordsResponse ssafyResponseRecord =
                        repaymentClient.inquireRepaymentRecords(userKey, loanAccount.getAccountNo());
                SsafyRepaymentRecord repaymentRecord = ssafyResponseRecord.getRec();

                // 남은 대출 잔액 합산
                long remainingLoanBalance = Long.parseLong(repaymentRecord.getRemainingLoanBalance());
                totalLoanBalance = Math.addExact(totalLoanBalance, remainingLoanBalance);

                Set<Integer> paidInstallments = getPaidInstallments(repaymentRecord);

                // 전액 상환한 계좌는 예정 금액과 다음 상환일 계산에서 제외
                if (remainingLoanBalance <= 0) {
                    continue;
                }

                // 이번 달 미납 회차의 원금과 이자 합산
                long monthlyRepaymentAmount = calculateMonthlyDueAmount(loanAccount, paidInstallments, today);
                thisMonthRepaymentAmount = Math.addExact(thisMonthRepaymentAmount, monthlyRepaymentAmount);

                // 여러 계좌 중 가장 빠른 다음 상환일 선택
                LocalDate accountNextRepaymentDate = getNextRepaymentDate(loanAccount, paidInstallments, today);

                if (accountNextRepaymentDate == null) {
                    continue;
                }

                if (nextRepaymentDate == null || accountNextRepaymentDate.isBefore(nextRepaymentDate)) {
                    nextRepaymentDate = accountNextRepaymentDate;
                }
            }

            // 응답 생성
            RepaymentManagement response = new RepaymentManagement(
                    nextRepaymentDate,
                    thisMonthRepaymentAmount,
                    totalLoanBalance
            );

            return response;
        } catch (RuntimeException exception) {
            // 외부 실패를 잔액 0원으로 숨기지 않는다. 계좌번호와 userKey는 기록하지 않는다.
            log.warn("대시보드 금융망 조회 또는 응답 해석 실패: {}", exception.getClass().getSimpleName());
            throw new BusinessException(ErrorCode.FINANCE_API_ERROR);
        }
    }

    // 성공한 상환 회차만 모아서 중복 제거
    private Set<Integer> getPaidInstallments(SsafyRepaymentRecord repaymentRecord) {

        List<RepaymentRecordList> repaymentRecords = repaymentRecord.getRepaymentRecords();

        if (repaymentRecords == null) {
            throw new IllegalStateException("금융망 상환 내역 누락");
        }

        Set<Integer> paidInstallments = new HashSet<>();

        for (RepaymentRecordList record : repaymentRecords) {
            if (!"SUCCESS".equals(record.getStatus())) {
                continue;
            }

            int installmentNumber = Integer.parseInt(record.getInstallmentNumber());
            paidInstallments.add(installmentNumber);
        }

        return paidInstallments;
    }

    // 이번 달 미납 회차의 예정 금액 계산 (이번 달 연체 포함)
    private long calculateMonthlyDueAmount(
            SsafyInquireLoanAccountDetail loanAccount,
            Set<Integer> paidInstallments,
            LocalDate today
    ) {

        long loanBalance = Long.parseLong(loanAccount.getLoanBalance());
        int loanPeriod = Integer.parseInt(loanAccount.getLoanPeriod());
        double interestRate = Double.parseDouble(loanAccount.getInterestRate());

        if (loanPeriod <= 0) {
            throw new IllegalArgumentException("대출 기간은 양수여야 합니다.");
        }

        LocalDate loanDate = LocalDate.parse(loanAccount.getLoanDate(), DateTimeFormatter.BASIC_ISO_DATE);
        LocalDate maturityDate = LocalDate.parse(loanAccount.getMaturityDate(), DateTimeFormatter.BASIC_ISO_DATE);

        // 이번 달에 해당하는 첫 회차와 마지막 회차 계산
        YearMonth currentMonth = YearMonth.from(today);
        LocalDate monthStartDate = currentMonth.atDay(1);
        LocalDate monthEndDate = currentMonth.atEndOfMonth();

        long firstInstallment = Math.max(1, ChronoUnit.DAYS.between(loanDate, monthStartDate));
        long monthEndInstallment = ChronoUnit.DAYS.between(loanDate, monthEndDate);
        long maturityInstallment = ChronoUnit.DAYS.between(loanDate, maturityDate);
        long lastInstallment = Math.min(loanPeriod, Math.min(monthEndInstallment, maturityInstallment));

        long monthlyRepaymentAmount = 0L;

        for (long installmentNumber = firstInstallment; installmentNumber <= lastInstallment; installmentNumber++) {

            // 이미 납부한 회차 제외
            if (paidInstallments.contains((int) installmentNumber)) {
                continue;
            }

            long dailyDueAmount = calculateDailyDueAmount(loanBalance, loanPeriod, interestRate, installmentNumber);
            monthlyRepaymentAmount = Math.addExact(monthlyRepaymentAmount, dailyDueAmount);
        }

        return monthlyRepaymentAmount;
    }

    // 기존 RepaymentServiceImpl과 동일한 회차별 원금, 일 이자 계산
    private long calculateDailyDueAmount(long loanBalance, int loanPeriod, double interestRate, long installmentNumber) {

        // 기본적으로 매일 갚는 원금
        long principalPerDay = loanBalance / loanPeriod;

        // 해당 회차 상환 전 남아 있는 원금
        long remainingPrincipal = loanBalance - (principalPerDay * (installmentNumber - 1));

        // 마지막 회차에는 나머지 원금을 모두 상환
        long principalDue;

        if (installmentNumber == loanPeriod) {
            principalDue = remainingPrincipal;
        } else {
            principalDue = principalPerDay;
        }

        // 하루치 이자
        long interest = Math.round(
                remainingPrincipal
                        * (interestRate / 100.0)
                        * (1.0 / 365.0)
        );

        return Math.addExact(principalDue, interest);
    }

    // 실행 다음 날부터 일 단위 상환. 오늘 이후의 미납 회차 중 가장 빠른 날짜 반환
    private LocalDate getNextRepaymentDate(
            SsafyInquireLoanAccountDetail loanAccount,
            Set<Integer> paidInstallments,
            LocalDate today
    ) {

        LocalDate loanDate = LocalDate.parse(loanAccount.getLoanDate(), DateTimeFormatter.BASIC_ISO_DATE);
        LocalDate maturityDate = LocalDate.parse(loanAccount.getMaturityDate(), DateTimeFormatter.BASIC_ISO_DATE);
        int loanPeriod = Integer.parseInt(loanAccount.getLoanPeriod());

        long firstInstallment = Math.max(1, ChronoUnit.DAYS.between(loanDate, today));

        for (long installmentNumber = firstInstallment; installmentNumber <= loanPeriod; installmentNumber++) {
            LocalDate repaymentDate = loanDate.plusDays(installmentNumber);

            if (repaymentDate.isAfter(maturityDate)) {
                break;
            }

            if (paidInstallments.contains((int) installmentNumber)) {
                continue;
            }

            return repaymentDate;
        }

        return null;
    }
}
