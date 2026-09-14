package com.sobi.bookmark.dto;

import com.sobi.loan.entity.Loan;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class LoanList {

    private Long loanId;
    private String accountName;
    private String bankName;
    private Double interestRate;
    private Long maxLoanBalance;
    private Long minLoanBalance;
    private Integer period;
    private String status;

    public static LoanList from(Loan loan) {
        return LoanList.builder()
                .loanId(loan.getId())
                .accountName(loan.getAccountName())
                .bankName(loan.getBankName())
                .interestRate(loan.getInterestRate())
                .maxLoanBalance(loan.getMaxLoanBalance())
                .minLoanBalance(loan.getMinLoanBalance())
                .period(loan.getPeriod())
                .status("임시")
                .build();
    }

}
