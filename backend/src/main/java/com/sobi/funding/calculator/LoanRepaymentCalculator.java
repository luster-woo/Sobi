package com.sobi.funding.calculator;


import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class LoanRepaymentCalculator {

    private static final int REPAYMENT_MONTHS = 36; // 상환 기간을 36개월로 고정

    public RepaymentResult calculate(
            long principal, // 대출 원금
            BigDecimal annualInterestRate   // 연이율
    ) {

        // 대출 원금이 0 이하면 전부 0으로 리턴
        if (principal <= 0) {
            return new RepaymentResult(0L, 0L, 0L);
        }

        // 연이율을 소숫점으로 변환
        double annualRate = annualInterestRate.doubleValue() / 100.0;

        // 월 이율 계산(12로 나눔)
        double monthlyRate = annualRate / 12.0;

        double monthlyPayment;

        /*
         * 무이자 대출 처리
         */
        // 월 이율이 0이면 -> 무이자 대출
        if (monthlyRate == 0) {

            // 원금 / 36
            monthlyPayment = (double) principal / REPAYMENT_MONTHS;

        } else {

            double pow = Math.pow(1 + monthlyRate, REPAYMENT_MONTHS);

            monthlyPayment = principal * monthlyRate * pow / (pow - 1);
        }

        long roundedMonthlyPayment = Math.round(monthlyPayment);

        /*
         * 총 상환금액은
         * 반올림 전 monthlyPayment 기준으로 계산
         */
        long totalPayment = Math.round(monthlyPayment * REPAYMENT_MONTHS);

        long totalInterest = totalPayment - principal;

        return new RepaymentResult(
                roundedMonthlyPayment,
                totalInterest,
                totalPayment
        );
    }

    public record RepaymentResult(

            long monthlyPayment,    // 매월 납부할 원리금
            long totalInterest,     // 총 발생 이자
            long totalPayment       // 총 상환 금액(원금 + 이자)

    ) {
    }
}