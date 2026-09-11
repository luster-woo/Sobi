package com.sobi.repayment.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LoanBalanceInFullRequest {

    private String accountNo;
}
