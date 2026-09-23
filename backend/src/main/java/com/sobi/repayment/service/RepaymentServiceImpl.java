package com.sobi.repayment.service;


import com.sobi.account.entity.Account;
import com.sobi.account.repository.AccountRepository;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import com.sobi.repayment.calculator.RepaymentSchedule;
import com.sobi.repayment.client.SsafyRepaymentClient;
import com.sobi.repayment.clientDto.SsafyInquireLoanAccountDetail;
import com.sobi.repayment.clientDto.SsafyInquireLoanAccountListResponse;
import com.sobi.repayment.clientDto.SsafyInquireRepaymentRecordsResponse;
import com.sobi.repayment.dto.*;
import com.sobi.user.entity.User;
import com.sobi.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.time.ZoneId;

@Service
@RequiredArgsConstructor
public class RepaymentServiceImpl implements RepaymentService {

    private final UserRepository userRepository;
    private final SsafyRepaymentClient ssafyRepaymentClient;
    private final AccountRepository accountRepository;

    @Override
    public LoanListResponse getList(Long userId) {

        // userid 기반으로 userkey를 가져와서 클라이언트 호출
        User user = userRepository.findById(userId).orElseThrow(
                () -> new BusinessException(ErrorCode.NO_USER)
        );

        // 금융망 api 호출
        SsafyInquireLoanAccountListResponse ssafyResponse = ssafyRepaymentClient.inquireLoanAccountList(user.getUserKey());

        // 결과값에서 필요한 값 파싱
        List<LoanProductList> loanProductLists = new ArrayList<>();
        for(SsafyInquireLoanAccountDetail detail : ssafyResponse.getDetails()) {

            // dailyDueAmount 계산 (내일 빠져나갈 금액)
            long dailyDueAmount = calculateNextDueAmount(detail);

            // 출금계좌 은행명 조회
            Account account = accountRepository.findByAccountNo(detail.getWithdrawalAccountNo());

            String bankName = account.getBankName();
            // 리스트에 넣기
            loanProductLists.add(LoanProductList.builder()
                            .accountNo(detail.getAccountNo())
                            .accountName(detail.getAccountName())
                            .status(detail.getStatus())
                            .accountTypeUniqueNo(detail.getAccountTypeUniqueNo())
                            .loanPeriod(detail.getLoanPeriod())
                            .loanDate(detail.getLoanDate())
                            .maturityDate(detail.getMaturityDate())
                            .loanBalance(detail.getLoanBalance())
                            .interestRate(detail.getInterestRate())
                            .withdrawalAccountNo(detail.getWithdrawalAccountNo())
                            .dailyDueAmount(dailyDueAmount)
                            .bankName(bankName)
                            .build());
        }

        // 응답 생성
        LoanListResponse response = LoanListResponse.builder()
                .loanProductList(loanProductLists)
                .build();

        return response;
    }


    @Override
    public RecordResponse getRecord(Long userId, RecordRequest request) {

        // userid 기반으로 userkey를 가져와서 클라이언트 호출
        User user = userRepository.findById(userId).orElseThrow(
                () -> new BusinessException(ErrorCode.NO_USER)
        );

        // 금융망 api로 보내기 대출 상환 내역
        SsafyInquireRepaymentRecordsResponse ssafyResponseRecord = ssafyRepaymentClient.inquireRepaymentRecords(user.getUserKey(), request.getAccountNo());

        // 금융망 api 호출 대출 상품 가입 목록 조회
        SsafyInquireLoanAccountListResponse ssafyResponseList = ssafyRepaymentClient.inquireLoanAccountList(user.getUserKey());

        // 가져와서 필요한 정보 파싱


        SsafyInquireLoanAccountDetail loanDetail =
                ssafyResponseList.getDetails().stream()
                        .filter(detail -> request.getAccountNo().equals(detail.getAccountNo()))
                        .findFirst()
                        .orElseThrow(() -> new RuntimeException("해당 계좌를 찾을 수 없습니다."));

        /*
         * 금액은 금융망 응답(loanBalance·remainingLoanBalance·paymentBalance)을 쓰지 않고
         * 원금·이율·기간으로 직접 계산한다. 금융망이 회차마다 전체 기간치 이자를 중복해서
         * 붙이기 때문이다 — 자세한 내용은 RepaymentSchedule 주석 참고.
         */
        RepaymentSchedule schedule = RepaymentSchedule.from(loanDetail);

        // 성공한 상환 횟수
        long successCount = ssafyResponseRecord.getRec()
                        .getRepaymentRecords()
                        .stream()
                        .filter(record ->
                                "SUCCESS".equals(record.getStatus())
                        )
                        .count();

        // 남은 상환액(원금 + 이자)
        long remainingLoanBalance = schedule.getRemainingBalance(successCount);

        // 일시납 시 납부해야 하는 금액 = 남은 순수 원금
        long totalPayoffAmount = schedule.getRemainingPrincipal(successCount);

        // 일시납으로 아낄 수 있는 이자
        long interestSaved = schedule.getInterestSaved(successCount);

        //response 생성

        RecordResponse response = RecordResponse.from(
                ssafyResponseRecord,
                schedule,
                remainingLoanBalance,
                totalPayoffAmount,
                interestSaved
        );



        return response;
    }

    @Override
    public void loanBalanceInFull(LoanBalanceInFullRequest request, Long userId) {
        // 걍 순수 호출만 하면 끝 아닌가

        // userid 기반으로 userkey를 가져와서 클라이언트 호출
        User user = userRepository.findById(userId).orElseThrow(
                () -> new BusinessException(ErrorCode.NO_USER)
        );

        ssafyRepaymentClient.updateRepaymentLoanBalanceInFull(user.getUserKey(), request.getAccountNo());

    }

    /**
     * '다음 날 상환액' 계산.
     *
     * 금융망은 실행 다음 날 08:30부터 하루에 한 회차씩 출금한다. 그래서 오늘이 아니라
     * '내일 빠질 회차'의 금액을 보여준다 — 실행 당일에도 1회차 금액이 보여야 한다.
     *
     * 회차는 실제 상환 기록이 아니라 날짜로 센다. 목록에 있는 계좌마다 상환 내역 API를
     * 한 번씩 더 부르지 않기 위해서다. 연체가 쌓이면 실제 회차와 어긋날 수 있지만,
     * 회차별 금액이 균등해서 보여줄 금액 자체는 달라지지 않는다.
     */
    private long calculateNextDueAmount(SsafyInquireLoanAccountDetail detail) {

        LocalDate loanDate = LocalDate.parse(
                detail.getLoanDate(),
                DateTimeFormatter.ofPattern("yyyyMMdd")
        );

        LocalDate maturityDate = LocalDate.parse(
                detail.getMaturityDate(),
                DateTimeFormatter.ofPattern("yyyyMMdd")
        );

        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));

        // 만기가 지났으면 더 빠져나갈 회차가 없다
        if (!today.isBefore(maturityDate)) {
            return 0L;
        }

        // 내일이 몇 번째 상환일인지 계산 (실행 당일이면 1회차)
        long nextInstallmentNumber =
                ChronoUnit.DAYS.between(loanDate, today) + 1;

        // 회차 범위를 벗어나면 0을 돌려준다
        return RepaymentSchedule.from(detail)
                .getInstallmentAmount(nextInstallmentNumber);
    }
}
