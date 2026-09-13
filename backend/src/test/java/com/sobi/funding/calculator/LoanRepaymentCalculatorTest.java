package com.sobi.funding.calculator;


import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class LoanRepaymentCalculatorTest {

    private LoanRepaymentCalculator calculator;

    @BeforeEach
    void setUp() {
        calculator =
                new LoanRepaymentCalculator();
    }

    @Test
    void 원리금균등상환_계산() {

        // given
        long principal =
                30_000_000L;

        BigDecimal interestRate =
                new BigDecimal("3.4");

        // when
        LoanRepaymentCalculator.RepaymentResult result =
                calculator.calculate(
                        principal,
                        interestRate
                );

        // then
        System.out.println(
                "월 상환액 = "
                        + result.monthlyPayment()
        );

        System.out.println(
                "총 이자 = "
                        + result.totalInterest()
        );

        System.out.println(
                "총 상환액 = "
                        + result.totalPayment()
        );

        assertThat(
                result.monthlyPayment()
        ).isGreaterThan(0);

        assertThat(
                result.totalInterest()
        ).isGreaterThan(0);

        assertThat(
                result.totalPayment()
        ).isGreaterThan(principal);
    }

    @Test
    void 무이자_대출_계산() {

        // given
        long principal =
                36_000_000L;

        BigDecimal interestRate =
                BigDecimal.ZERO;

        // when
        LoanRepaymentCalculator.RepaymentResult result =
                calculator.calculate(
                        principal,
                        interestRate
                );

        // then
        assertThat(
                result.monthlyPayment()
        ).isEqualTo(1_000_000L);

        assertThat(
                result.totalInterest()
        ).isEqualTo(0L);

        assertThat(
                result.totalPayment()
        ).isEqualTo(36_000_000L);
    }


    @Test
    void 대출금이_0원이면_모두_0원() {

        // when
        LoanRepaymentCalculator.RepaymentResult result =
                calculator.calculate(
                        0L,
                        new BigDecimal("3.4")
                );

        // then
        assertThat(
                result.monthlyPayment()
        ).isZero();

        assertThat(
                result.totalInterest()
        ).isZero();

        assertThat(
                result.totalPayment()
        ).isZero();
    }
}