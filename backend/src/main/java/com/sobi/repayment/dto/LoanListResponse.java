package com.sobi.repayment.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
public class LoanListResponse {


    private List<LoanProductList>  loanProductList;

}
