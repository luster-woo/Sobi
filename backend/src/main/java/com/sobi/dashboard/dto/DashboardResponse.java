package com.sobi.dashboard.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.sobi.insurance.entity.InsuranceChecklist;
import com.sobi.insurance.entity.InsuranceStatus;
import com.sobi.loan.entity.Loan;
import com.sobi.support.entity.SupportProgram;

import java.time.LocalDate;
import java.util.List;

/** 역할에 따라 서로 다른 필드 집합을 반환한다. */
public interface DashboardResponse {

    record Entrepreneur(
            List<Sales> recentSalesHistory,
            long latestMonthlySales,
            long totalLoanBalance,
            List<Insurance> insurances,
            SupportSummary supportProgramSummary,
            RepaymentManagement repaymentManagement,
            List<LoanItem> suggestLoans,
            @JsonProperty("suggestsupportProgram") List<SupportItem> suggestSupportProgram
    ) implements DashboardResponse {}

    record PreEntrepreneur(
            List<Insurance> insurances,
            @JsonProperty("Loans") List<LoanItem> loans,
            List<SupportItem> supportProgram
    ) implements DashboardResponse {}

    record Sales(String period, long revenue) {}

    record Insurance(Long insuranceChecklistId, String insuranceName, InsuranceStatus status) {
        public static Insurance from(InsuranceChecklist checklist) {
            return new Insurance(checklist.getId(), checklist.getInsurance().getName(), checklist.getStatus());
        }
    }

    record SupportSummary(long availableCount, long imminentCount, long unavailableCount, long totalCount) {}

    record RepaymentManagement(LocalDate nextRepaymentDate, long thisMonthRepaymentAmount,
                               long totalLoanBalance) {}

    record LoanItem(Long loanId, String accountName, String bankName, Double interestRate,
                    Long maxLoanBalance, Long minLoanBalance, Integer period) {
        public static LoanItem from(Loan loan) {
            return new LoanItem(loan.getId(), loan.getAccountName(), loan.getBankName(),
                    loan.getInterestRate(), loan.getMaxLoanBalance(), loan.getMinLoanBalance(), loan.getPeriod());
        }
    }

    record SupportItem(Long supportProgramId, String pblancNm, String jrsdInsttNm,
                       @JsonProperty("min_balance") Long minBalance,
                       @JsonProperty("max_balance") Long maxBalance,
                       @JsonProperty("end_date") LocalDate endDate,
                       Double interestRateOfSP) {
        public static SupportItem from(SupportProgram program) {
            return new SupportItem(program.getId(), program.getPblancNm(), program.getJrsdinsttNm(),
                    program.getMinBalance(), program.getMaxBalance(), program.getEndDate(), program.getInterestRate());
        }
    }
}
