package com.sobi.funding.service;

import com.sobi.funding.calculator.LoanRepaymentCalculator;
import com.sobi.funding.domain.FundingCandidate;
import com.sobi.funding.domain.FundingCombination;
import com.sobi.funding.domain.FundingItemResult;
import com.sobi.funding.domain.FundingType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class FundingRecommendationEngine {

    private static final int MAX_ITEM_COUNT = 3;
    private static final int TOP_COUNT = 3;

    private final LoanRepaymentCalculator repaymentCalculator;

    private static final Comparator<FundingCombination> COMPARATOR =
            Comparator.comparingLong(FundingCombination::totalRepaymentAmount)
                    .thenComparingLong(FundingCombination::monthlyRepaymentAmount)
                    .thenComparing(FundingCombination::averageInterestRate)
                    .thenComparingInt(combination -> combination.items().size());

    public List<List<FundingCandidate>> generateValidCombinations(
            List<FundingCandidate> candidates,
            long targetAmount
    ) {

        List<List<FundingCandidate>> result = new ArrayList<>();

        int maxSize = Math.min(MAX_ITEM_COUNT, candidates.size());

        // 1개, 2개, 3개 조합 생성
        for (int size = 1; size <= maxSize; size++) {
            generate(
                    candidates,
                    targetAmount,
                    size,
                    0,
                    new ArrayList<>(),
                    result
            );
        }

        return result;
    }

    private void generate(
            List<FundingCandidate> candidates,
            long targetAmount,
            int targetSize,
            int startIndex,
            List<FundingCandidate> selected,
            List<List<FundingCandidate>> result
    ) {

        // 원하는 개수만큼 선택했으면 사용 가능한 조합인지 검사
        if (selected.size() == targetSize) {

            if (canSatisfyTarget(selected, targetAmount)) {
                result.add(new ArrayList<>(selected));
            }

            return;
        }

        // 조합 생성
        for (int i = startIndex; i < candidates.size(); i++) {

            selected.add(candidates.get(i));

            generate(
                    candidates,
                    targetAmount,
                    targetSize,
                    i + 1,
                    selected,
                    result
            );

            // 백트래킹
            selected.remove(selected.size() - 1);
        }
    }

    private boolean canSatisfyTarget(
            List<FundingCandidate> candidates,
            long targetAmount
    ) {

        long totalMinAmount = candidates.stream()
                .mapToLong(FundingCandidate::minAmount)
                .sum();

        long totalMaxAmount = candidates.stream()
                .mapToLong(FundingCandidate::maxAmount)
                .sum();

        return totalMinAmount <= targetAmount
                && targetAmount <= totalMaxAmount;
    }

    public List<FundingCombination> recommend(
            List<FundingCandidate> candidates,
            long targetAmount
    ) {

        List<List<FundingCandidate>> validCombinations =
                generateValidCombinations(candidates, targetAmount);

        List<FundingCombination> evaluated = validCombinations.stream()
                .map(combination -> evaluateCombination(combination, targetAmount))
                .toList();

        /*
         * 0원 배분된 후보 때문에
         * 사실상 동일한 조합이 생길 수 있어서 중복 제거
         */
        Map<String, FundingCombination> unique = new HashMap<>();

        for (FundingCombination combination : evaluated) {

            String key = createCombinationKey(combination);

            unique.merge(
                    key,
                    combination,
                    (existing, incoming) ->
                            COMPARATOR.compare(existing, incoming) <= 0
                                    ? existing
                                    : incoming
            );
        }

        return unique.values()
                .stream()
                .sorted(COMPARATOR)
                .limit(TOP_COUNT)
                .toList();
    }

    private FundingCombination evaluateCombination(
            List<FundingCandidate> candidates,
            long targetAmount
    ) {

        Map<FundingCandidate, Long> allocations = new HashMap<>();

        long minimumTotal = 0L;

        // 모든 상품의 최소 금액을 우선 할당
        for (FundingCandidate candidate : candidates) {
            allocations.put(candidate, candidate.minAmount());
            minimumTotal += candidate.minAmount();
        }

        long remaining = targetAmount - minimumTotal;

        /*
         * 추가 배분 우선순위
         * 1. 지원금
         * 2. 대출 중 낮은 금리
         */
        List<FundingCandidate> allocationOrder = candidates.stream()
                .sorted(
                        Comparator
                                .comparingInt(
                                        (FundingCandidate candidate) ->
                                                candidate.fundingType() == FundingType.GRANT ? 0 : 1
                                )
                                .thenComparing(FundingCandidate::interestRate)
                )
                .toList();

        for (FundingCandidate candidate : allocationOrder) {

            if (remaining <= 0) {
                break;
            }

            long currentAmount = allocations.get(candidate);
            long availableAmount = candidate.maxAmount() - currentAmount;
            long additionalAmount = Math.min(availableAmount, remaining);

            allocations.put(
                    candidate,
                    currentAmount + additionalAmount
            );

            remaining -= additionalAmount;
        }

        return calculateCombination(allocations, targetAmount);
    }

    private FundingCombination calculateCombination(
            Map<FundingCandidate, Long> allocations,
            long targetAmount
    ) {

        List<FundingItemResult> items = new ArrayList<>();

        long grantAmount = 0L;
        long loanPrincipal = 0L;
        long monthlyRepaymentAmount = 0L;
        long totalInterest = 0L;

        BigDecimal weightedInterestSum = BigDecimal.ZERO;

        for (Map.Entry<FundingCandidate, Long> entry : allocations.entrySet()) {

            FundingCandidate candidate = entry.getKey();
            long amount = entry.getValue();

            // 실제 배정액이 0원이면 프론트에 표시하지 않음
            if (amount <= 0) {
                continue;
            }

            BigDecimal interestRate =
                    candidate.fundingType() == FundingType.GRANT
                            ? BigDecimal.ZERO
                            : candidate.interestRate();

            items.add(
                    new FundingItemResult(
                            candidate.id(),
                            candidate.sourceType(),
                            candidate.fundingType(),
                            candidate.name(),
                            amount,
                            interestRate
                    )
            );

            // 평균 조달 금리 계산용
            weightedInterestSum = weightedInterestSum.add(
                    interestRate.multiply(BigDecimal.valueOf(amount))
            );

            // 지원금은 상환하지 않음
            if (candidate.fundingType() == FundingType.GRANT) {
                grantAmount += amount;
                continue;
            }

            // 대출
            loanPrincipal += amount;

            LoanRepaymentCalculator.RepaymentResult repayment =
                    repaymentCalculator.calculate(amount, interestRate);

            monthlyRepaymentAmount += repayment.monthlyPayment();
            totalInterest += repayment.totalInterest();
        }

        BigDecimal averageInterestRate = weightedInterestSum.divide(
                BigDecimal.valueOf(targetAmount),
                2,
                RoundingMode.HALF_UP
        );

        long totalRepaymentAmount = loanPrincipal + totalInterest;

        /*
         * 프론트 표시 순서
         * 지원금 → 저금리 대출
         */
        items.sort(
                Comparator
                        .comparingInt(
                                (FundingItemResult item) ->
                                        item.fundingType() == FundingType.GRANT ? 0 : 1
                        )
                        .thenComparing(FundingItemResult::interestRate)
        );

        return new FundingCombination(
                items,
                targetAmount,
                grantAmount,
                loanPrincipal,
                averageInterestRate,
                monthlyRepaymentAmount,
                totalInterest,
                totalRepaymentAmount
        );
    }

    private String createCombinationKey(FundingCombination combination) {

        return combination.items()
                .stream()
                .map(item ->
                        item.sourceType()
                                + ":"
                                + item.id()
                                + ":"
                                + item.allocatedAmount()
                )
                .sorted()
                .collect(Collectors.joining("|"));
    }
}