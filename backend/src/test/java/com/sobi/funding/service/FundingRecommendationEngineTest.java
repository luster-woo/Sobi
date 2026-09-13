package com.sobi.funding.service;


import com.sobi.funding.calculator.LoanRepaymentCalculator;
import com.sobi.funding.domain.FundingCandidate;
import com.sobi.funding.domain.FundingCombination;
import com.sobi.funding.domain.FundingSourceType;
import com.sobi.funding.domain.FundingType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class FundingRecommendationEngineTest {

    private FundingRecommendationEngine engine;

    @BeforeEach
    void setUp() {

        LoanRepaymentCalculator calculator =
                new LoanRepaymentCalculator();

        engine =
                new FundingRecommendationEngine(
                        calculator
                );
    }

    @Test
    void 목표금액을_충족할_수_있는_조합만_생성한다() {

        // given
        List<FundingCandidate> candidates =
                List.of(

                        new FundingCandidate(
                                1L,
                                FundingSourceType.SUPPORT_PROGRAM,
                                FundingType.GRANT,
                                "스마트상점 바우처",
                                0L,
                                5_000_000L,
                                BigDecimal.ZERO
                        ),

                        new FundingCandidate(
                                2L,
                                FundingSourceType.SUPPORT_PROGRAM,
                                FundingType.LOAN,
                                "경영안정자금",
                                5_000_000L,
                                30_000_000L,
                                new BigDecimal("3.4")
                        ),

                        new FundingCandidate(
                                3L,
                                FundingSourceType.LOAN_PRODUCT,
                                FundingType.LOAN,
                                "KB 소상공인 대출",
                                10_000_000L,
                                50_000_000L,
                                new BigDecimal("4.1")
                        ),

                        new FundingCandidate(
                                4L,
                                FundingSourceType.LOAN_PRODUCT,
                                FundingType.LOAN,
                                "신한 사업자 대출",
                                5_000_000L,
                                40_000_000L,
                                new BigDecimal("3.8")
                        )
                );

        long targetAmount =
                50_000_000L;

        // when
        List<List<FundingCandidate>> combinations =
                engine.generateValidCombinations(
                        candidates,
                        targetAmount
                );

        // then
        combinations.forEach(
                combination -> {

                    System.out.println(
                            combination.stream()
                                    .map(
                                            FundingCandidate::name
                                    )
                                    .toList()
                    );
                }
        );

        assertThat(combinations)
                .isNotEmpty();
    }

    @Test
    void 상품은_최대_3개까지만_조합한다() {

        // given
        List<FundingCandidate> candidates =
                List.of(
                        createCandidate(1L),
                        createCandidate(2L),
                        createCandidate(3L),
                        createCandidate(4L),
                        createCandidate(5L)
                );

        // when
        List<List<FundingCandidate>> combinations =
                engine.generateValidCombinations(
                        candidates,
                        10_000_000L
                );

        // then
        assertThat(combinations)
                .allSatisfy(
                        combination ->
                                assertThat(
                                        combination.size()
                                ).isLessThanOrEqualTo(3)
                );
    }

    @Test
    void 어떤_조합으로도_목표금액을_충족하지_못하면_빈_리스트를_반환한다() {

        // given
        List<FundingCandidate> candidates =
                List.of(
                        new FundingCandidate(
                                1L,
                                FundingSourceType.LOAN_PRODUCT,
                                FundingType.LOAN,
                                "대출 A",
                                0L,
                                5_000_000L,
                                new BigDecimal("3.5")
                        ),
                        new FundingCandidate(
                                2L,
                                FundingSourceType.LOAN_PRODUCT,
                                FundingType.LOAN,
                                "대출 B",
                                0L,
                                5_000_000L,
                                new BigDecimal("4.0")
                        )
                );

        // when
        List<List<FundingCandidate>> combinations =
                engine.generateValidCombinations(
                        candidates,
                        50_000_000L
                );

        // then
        assertThat(combinations)
                .isEmpty();
    }

    private FundingCandidate createCandidate(
            Long id
    ) {

        return new FundingCandidate(
                id,
                FundingSourceType.LOAN_PRODUCT,
                FundingType.LOAN,
                "대출 " + id,
                0L,
                20_000_000L,
                new BigDecimal("4.0")
        );
    }

    @Test
    void 가장_유리한_조합_3개를_추천한다() {

        // given
        List<FundingCandidate> candidates =
                List.of(

                        new FundingCandidate(
                                1L,
                                FundingSourceType.SUPPORT_PROGRAM,
                                FundingType.GRANT,
                                "스마트상점 바우처",
                                0L,
                                5_000_000L,
                                BigDecimal.ZERO
                        ),

                        new FundingCandidate(
                                2L,
                                FundingSourceType.SUPPORT_PROGRAM,
                                FundingType.LOAN,
                                "경영안정자금",
                                5_000_000L,
                                30_000_000L,
                                new BigDecimal("3.4")
                        ),

                        new FundingCandidate(
                                3L,
                                FundingSourceType.LOAN_PRODUCT,
                                FundingType.LOAN,
                                "KB 소상공인 대출",
                                10_000_000L,
                                50_000_000L,
                                new BigDecimal("4.1")
                        ),

                        new FundingCandidate(
                                4L,
                                FundingSourceType.LOAN_PRODUCT,
                                FundingType.LOAN,
                                "신한 사업자 대출",
                                5_000_000L,
                                40_000_000L,
                                new BigDecimal("3.8")
                        )
                );

        long targetAmount =
                50_000_000L;

        // when
        List<FundingCombination> result =
                engine.recommend(
                        candidates,
                        targetAmount
                );

        // then
        assertThat(result)
                .hasSize(3);

        for (int i = 0; i < result.size(); i++) {

            FundingCombination combination =
                    result.get(i);

            System.out.println(
                    "======== 추천 "
                            + (i + 1)
                            + " ========"
            );

            combination.items()
                    .forEach(item ->
                            System.out.println(
                                    item.name()
                                            + " / "
                                            + item.allocatedAmount()
                                            + "원 / "
                                            + item.interestRate()
                                            + "%"
                            )
                    );

            System.out.println(
                    "총 조달액 = "
                            + combination.totalFinancingAmount()
            );

            System.out.println(
                    "지원금 = "
                            + combination.grantAmount()
            );

            System.out.println(
                    "대출 원금 = "
                            + combination.loanPrincipal()
            );

            System.out.println(
                    "평균 조달 금리 = "
                            + combination.averageInterestRate()
            );

            System.out.println(
                    "월 상환액 = "
                            + combination.monthlyRepaymentAmount()
            );

            System.out.println(
                    "총 이자 = "
                            + combination.totalInterest()
            );

            System.out.println(
                    "총 상환액 = "
                            + combination.totalRepaymentAmount()
            );
        }
    }
}