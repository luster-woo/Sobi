package com.sobi.repayment.clientDto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class SsafyInquireLoanAccountDetail {

    private String accountNo;
    private String accountName;
    private String status;
    private String accountTypeUniqueNo;
    private String loanPeriod;
    private String loanDate;
    private String maturityDate;
    private String loanBalance;
    private String interestRate;
    private String withdrawalAccountNo;

}

/*
            "accountNo": "0044815881614041",
            "accountName": "국민은행 믿고 가입하는 대출",
            "status": "개설",
            "accountTypeUniqueNo": "004-4-67140989453846",
            "loanPeriod": "5",
            "loanDate": "20240415",
            "maturityDate": "20240420",
            "loanBalance": "100000000",
            "interestRate": "20",
            "withdrawalAccountNo": "0324003842129948"

 */