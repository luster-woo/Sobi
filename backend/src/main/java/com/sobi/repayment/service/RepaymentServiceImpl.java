package com.sobi.repayment.service;


import com.sobi.account.entity.Account;
import com.sobi.account.repository.AccountRepository;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import com.sobi.repayment.client.SsafyRepaymentClient;
import com.sobi.repayment.clientDto.SsafyInquireLoanAccountDetail;
import com.sobi.repayment.clientDto.SsafyInquireLoanAccountListResponse;
import com.sobi.repayment.dto.LoanListResponse;
import com.sobi.repayment.dto.LoanProductList;
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

            // dailyDueAmount 계산
            long dailyDueAmount = calculateDailyDueAmount(detail);

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




    // dailyDueAmount 계산
    private long calculateDailyDueAmount(SsafyInquireLoanAccountDetail detail) {

        long loanBalance = Long.parseLong(detail.getLoanBalance());
        int loanPeriod = Integer.parseInt(detail.getLoanPeriod());
        double interestRate = Double.parseDouble(detail.getInterestRate());

        LocalDate loanDate = LocalDate.parse(
                detail.getLoanDate(),
                DateTimeFormatter.ofPattern("yyyyMMdd")
        );

        LocalDate maturityDate = LocalDate.parse(
                detail.getMaturityDate(),
                DateTimeFormatter.ofPattern("yyyyMMdd")
        );

        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));

        // 대출 실행일에는 아직 상환하지 않음
        if (!today.isAfter(loanDate)) {
            return 0L;
        }

        // 만기 이후
        if (today.isAfter(maturityDate)) {
            return 0L;
        }

        // 오늘이 몇 번째 상환일인지 계산
        int installmentNumber =
                (int) ChronoUnit.DAYS.between(loanDate, today);

        // 회차 범위 제한
        installmentNumber = Math.min(installmentNumber, loanPeriod);

        // 기본적으로 매일 갚는 원금
        long principalPerDay = loanBalance / loanPeriod;

        // 오늘 상환 전 남아 있는 원금
        long remainingPrincipal =
                loanBalance - (principalPerDay * (installmentNumber - 1));

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

        return principalDue + interest;
    }
}
