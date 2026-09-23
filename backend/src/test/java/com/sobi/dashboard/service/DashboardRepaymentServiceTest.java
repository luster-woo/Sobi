package com.sobi.dashboard.service;

import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import com.sobi.repayment.client.SsafyRepaymentClient;
import com.sobi.repayment.clientDto.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DashboardRepaymentServiceTest {
    @Mock SsafyRepaymentClient client;
    @InjectMocks DashboardRepaymentService service;

    @Test
    void unpaidMonthlyInstallmentsIncludeInterestAndFinalPrincipalRemainder() {
        // 9/16 실행, 3일 상환. 1회차 성공, 2회차 실패 → 2·3회차만 예정금액.
        var account = account("a", "20260916", "20260919", "3", "1000", "36.5");
        stubAccounts(List.of(account));
        stubRecords("a", "669", List.of(payment("1", "SUCCESS"), payment("1", "SUCCESS"), payment("2", "FAILED")));

        var result = service.getSummary("key", LocalDate.of(2026, 9, 17));

        assertThat(result.totalLoanBalance()).isEqualTo(669);
        // 2회차 333 + round(667 * .001)=334, 3회차 334 + round(334 * .001)=334
        assertThat(result.thisMonthRepaymentAmount()).isEqualTo(668);
        assertThat(result.nextRepaymentDate()).isEqualTo(LocalDate.of(2026, 9, 18));
    }

    @Test
    void monthBoundaryAndPaidOffAccountsAreExcludedFromSchedule() {
        stubAccounts(List.of(account("a", "20260929", "20261002", "3", "900", "0"),
                account("b", "20260901", "20260904", "3", "900", "0")));
        stubRecords("a", "900", List.of());
        stubRecords("b", "0", List.of());
        var result = service.getSummary("key", LocalDate.of(2026, 9, 29));
        assertThat(result.thisMonthRepaymentAmount()).isEqualTo(300);
        assertThat(result.totalLoanBalance()).isEqualTo(900);
        assertThat(result.nextRepaymentDate()).isEqualTo(LocalDate.of(2026, 9, 30));
    }

    @Test
    void noLoansReturnZeroAndNoNextDate() {
        stubAccounts(List.of());
        var result = service.getSummary("key", LocalDate.of(2026, 9, 17));
        assertThat(result.totalLoanBalance()).isZero();
        assertThat(result.thisMonthRepaymentAmount()).isZero();
        assertThat(result.nextRepaymentDate()).isNull();
        verify(client, never()).inquireRepaymentRecords(any(), any());
    }

    @Test
    void externalFailureDoesNotBecomeZeroBalance() {
        when(client.inquireLoanAccountList("key")).thenThrow(new RuntimeException("failure"));
        assertThatThrownBy(() -> service.getSummary("key", LocalDate.of(2026, 9, 17)))
                .isInstanceOfSatisfying(BusinessException.class,
                        error -> assertThat(error.getErrorCode()).isEqualTo(ErrorCode.FINANCE_API_ERROR));
    }

    private SsafyInquireLoanAccountDetail account(String no, String start, String end, String period,
                                                   String principal, String rate) {
        return SsafyInquireLoanAccountDetail.builder().accountNo(no).loanDate(start).maturityDate(end)
                .loanPeriod(period).loanBalance(principal).interestRate(rate).build();
    }

    private RepaymentRecordList payment(String installment, String status) {
        return RepaymentRecordList.builder().installmentNumber(installment).status(status).build();
    }

    private void stubAccounts(List<SsafyInquireLoanAccountDetail> accounts) {
        var response = new SsafyInquireLoanAccountListResponse();
        ReflectionTestUtils.setField(response, "details", accounts);
        when(client.inquireLoanAccountList("key")).thenReturn(response);
    }

    private void stubRecords(String no, String remaining, List<RepaymentRecordList> history) {
        var response = new SsafyInquireRepaymentRecordsResponse();
        ReflectionTestUtils.setField(response, "rec", SsafyRepaymentRecord.builder()
                .remainingLoanBalance(remaining).repaymentRecords(history).build());
        when(client.inquireRepaymentRecords("key", no)).thenReturn(response);
    }
}
