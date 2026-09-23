package com.sobi.mydata.dto;

import com.sobi.repayment.clientDto.SsafyInquireLoanAccountDetail;
import com.sobi.user.clientDto.SsafyDemandDepositAccountRecord;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * 금융망에서 받아온 값 묶음.
 *
 * 리스트가 둘이라 파라미터로 나열하면 순서를 바꿔 넣어도 컴파일이 통과한다.
 */
@Getter
@Builder
public class FinanceSnapshot {

    private final List<SsafyDemandDepositAccountRecord> depositAccounts;
    private final List<SsafyInquireLoanAccountDetail> loanAccounts;

    /** A~E. 조회 실패했거나 알 수 없으면 null */
    private final String creditRatingName;
}