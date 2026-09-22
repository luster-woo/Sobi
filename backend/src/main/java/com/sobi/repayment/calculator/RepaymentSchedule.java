package com.sobi.repayment.calculator;

import com.sobi.repayment.clientDto.SsafyInquireLoanAccountDetail;

/**
 * 대출 상환 스케줄 계산.
 *
 * <p>금융망이 내려주는 금액(loanBalance·remainingLoanBalance·paymentBalance)을 쓰지 않고
 * 원금·이율·기간만 받아 우리가 직접 계산한다. 금융망이 이자를 회차마다 전체 기간치로
 * 중복 부과하기 때문이다.
 *
 * <pre>
 *   금융망 실제:  총이자 = 원금 × 이율 × (기간/365) × 기간
 *   API 문서:     총이자 = 원금 × 이율 × (기간/365)
 * </pre>
 *
 * 예) 3,000만 원 / 365일 / 연 4.2% → 문서상 총 3,126만 원인데 금융망은 4억 8,990만 원을
 * 잡는다(2026-09-21 확인). 이 클래스는 문서 산식을 따른다.
 *
 * <p>⚠️ 출금 계좌에서 실제로 빠져나가는 돈은 여전히 금융망 금액이다. 이 계산은 화면에
 * 보여줄 값만 바로잡는 것이라, 계좌 거래내역과는 숫자가 맞지 않는다. 금융망이 고쳐지면
 * 이 클래스를 지우고 응답 값을 그대로 쓰면 된다.
 */
public final class RepaymentSchedule {

    private static final int DAYS_PER_YEAR = 365;

    /** 대출 원금 */
    private final long principal;

    /** 총 회차. 금융망이 하루에 한 회차씩 상환하므로 사실상 일수다 */
    private final int loanPeriod;

    /** 원금 + 이자 */
    private final long totalRepayment;

    /** 마지막 회차를 제외한 회차별 금액 */
    private final long installmentAmount;

    private RepaymentSchedule(long principal, int loanPeriod, double interestRate) {

        if (principal < 0) {
            throw new IllegalArgumentException("대출 원금은 음수일 수 없습니다.");
        }

        if (loanPeriod <= 0) {
            throw new IllegalArgumentException("대출 기간은 양수여야 합니다.");
        }

        this.principal = principal;
        this.loanPeriod = loanPeriod;

        // 총 이자 = 원금 × (이율/100) × (기간/365)
        long totalInterest = Math.round(
                principal
                        * (interestRate / 100.0)
                        * ((double) loanPeriod / DAYS_PER_YEAR)
        );

        this.totalRepayment = Math.addExact(principal, totalInterest);

        // 나누어 떨어지지 않는 나머지는 마지막 회차가 떠안는다
        this.installmentAmount = totalRepayment / loanPeriod;
    }

    public static RepaymentSchedule of(long principal, int loanPeriod, double interestRate) {
        return new RepaymentSchedule(principal, loanPeriod, interestRate);
    }

    /** 금융망 대출 계좌 상세에서 원금·기간·이율만 뽑아 만든다 */
    public static RepaymentSchedule from(SsafyInquireLoanAccountDetail detail) {
        return new RepaymentSchedule(
                Long.parseLong(detail.getLoanBalance()),
                Integer.parseInt(detail.getLoanPeriod()),
                Double.parseDouble(detail.getInterestRate())
        );
    }

    /** 대출 원금 */
    public long getPrincipal() {
        return principal;
    }

    public int getLoanPeriod() {
        return loanPeriod;
    }

    /** 만기까지 다 갚았을 때의 총액(원금 + 이자) */
    public long getTotalRepayment() {
        return totalRepayment;
    }

    /**
     * 해당 회차에 빠져나가는 금액.
     *
     * <p>회차 범위를 벗어나면 0이다. 대출 실행 당일이나 만기 이후처럼 '다음 상환이 없는'
     * 날에 호출부가 따로 분기하지 않아도 되게 하려는 것이다.
     */
    public long getInstallmentAmount(long installmentNumber) {

        if (installmentNumber < 1 || installmentNumber > loanPeriod) {
            return 0L;
        }

        if (installmentNumber == loanPeriod) {
            // 마지막 회차 = 총액 - 앞선 회차들의 합
            return totalRepayment - (installmentAmount * (loanPeriod - 1));
        }

        return installmentAmount;
    }

    /** 성공한 회차 수를 기준으로 남은 상환액(원금 + 이자) */
    public long getRemainingBalance(long paidCount) {

        if (paidCount >= loanPeriod) {
            return 0L;
        }

        long paid = installmentAmount * Math.max(paidCount, 0);
        return totalRepayment - paid;
    }

    /**
     * 성공한 회차 수를 기준으로 남은 원금.
     *
     * <p>일시납(완납) 때 내야 하는 금액으로 쓴다 — 남은 회차의 이자는 내지 않는다는 전제다.
     * 금융망이 완납 시 실제로 얼마를 출금하는지는 확인되지 않았다(완납 API를 부르면 계좌가
     * 해지돼 되돌릴 수 없어 시험하지 못했다).
     */
    public long getRemainingPrincipal(long paidCount) {

        if (paidCount >= loanPeriod) {
            return 0L;
        }

        long principalPerInstallment = principal / loanPeriod;
        long paid = principalPerInstallment * Math.max(paidCount, 0);

        return principal - paid;
    }

    /** 지금 완납하면 내지 않아도 되는 이자 */
    public long getInterestSaved(long paidCount) {
        return Math.max(0L, getRemainingBalance(paidCount) - getRemainingPrincipal(paidCount));
    }
}
