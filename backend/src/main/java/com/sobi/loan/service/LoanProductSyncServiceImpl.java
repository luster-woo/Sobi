package com.sobi.loan.service;

import com.sobi.loan.client.SsafyLoanClient;
import com.sobi.loan.clientDto.SsafyCreditRating;
import com.sobi.loan.clientDto.SsafyLoanProduct;
import com.sobi.loan.entity.Loan;
import com.sobi.loan.repository.LoanRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * 금융망에는 상품 수정·삭제 API가 없어 중복 등록을 되돌릴 수 없다.
 * 그래서 등록 전에 상품 목록을 조회해 같은 상품이 있으면 그 고유번호를 재사용하고,
 * 상품마다 등록 직후 바로 저장해 중간에 실패해도 다음 부팅에서 이어서 처리한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LoanProductSyncServiceImpl implements LoanProductSyncService {

    private final LoanRepository loanRepository;
    private final SsafyLoanClient loanClient;

    @Override
    public void syncUnregisteredProducts() {

        // 1. 고유번호가 비어 있는 상품 = 아직 금융망과 연결되지 않은 상품
        List<Loan> targets = loanRepository.findAllByAccountTypeUniqueNoIsNull();

        // 모두 연결된 상태면 금융망을 호출하지 않는다
        if (targets.isEmpty()) {
            log.info("금융망 미등록 대출 상품 없음 - 동기화 생략");
            return;
        }

        // 2. 이미 금융망에 등록된 상품 목록
        //    같은 apiKey 를 쓰는 다른 환경에서 먼저 등록했을 수 있다
        List<SsafyLoanProduct> registeredProducts =
                loanClient.inquireLoanProductList().getProducts();

        // 3. 등급명 → ratingUniqueNo 매핑 (ex: "D" → "RT-9xr3811ea45aa56hg")
        Map<String, String> ratingUniqueNos =
                loanClient.inquireCreditRatingList().getRatings().stream()
                        .collect(Collectors.toMap(
                                SsafyCreditRating::getRatingName,
                                SsafyCreditRating::getRatingUniqueNo
                        ));

        int linked = 0;
        int created = 0;

        // 4. 상품마다 "기존 상품 연결" 또는 "신규 등록" 후 고유번호 저장
        for (Loan loan : targets) {
            try {
                Optional<SsafyLoanProduct> registered =
                        findRegisteredProduct(registeredProducts, loan);

                String accountTypeUniqueNo;

                if (registered.isPresent()) {
                    // 금융망에 같은 상품이 있으면 등록하지 않고 번호만 가져온다
                    accountTypeUniqueNo = registered.get().getAccountTypeUniqueNo();
                    linked++;
                } else {
                    accountTypeUniqueNo = createProduct(loan, ratingUniqueNos);
                    created++;
                }

                // 등록 직후 바로 저장해야 이후 상품에서 실패해도 이 번호는 남는다
                loan.registerFinanceProduct(accountTypeUniqueNo);
                loanRepository.save(loan);

            } catch (RuntimeException e) {
                // 한 상품이 실패해도 나머지는 계속 처리하고, 실패한 상품은 다음 부팅 때 재시도된다
                log.error("대출 상품 동기화 실패 - loanId: {}, accountName: {}",
                        loan.getId(), loan.getAccountName(), e);
            }
        }

        log.info("대출 상품 동기화 완료 - 대상: {}, 기존 상품 연결: {}, 신규 등록: {}",
                targets.size(), linked, created);
    }

    // 금융망에 신규 등록하고 발급된 고유번호를 반환
    private String createProduct(Loan loan, Map<String, String> ratingUniqueNos) {

        String ratingUniqueNo = ratingUniqueNos.get(loan.getRatingName());

        if (ratingUniqueNo == null) {
            throw new IllegalStateException(
                    "금융망에 없는 신용등급입니다. ratingName: " + loan.getRatingName()
            );
        }

        String accountTypeUniqueNo =
                loanClient.createLoanProduct(loan, ratingUniqueNo)
                        .getProduct()
                        .getAccountTypeUniqueNo();

        log.info("금융망 대출 상품 등록 - loanId: {}, accountTypeUniqueNo: {}",
                loan.getId(), accountTypeUniqueNo);

        return accountTypeUniqueNo;
    }

    private Optional<SsafyLoanProduct> findRegisteredProduct(
            List<SsafyLoanProduct> products,
            Loan loan
    ) {
        return products.stream()
                .filter(product -> isSameProduct(product, loan))
                .findFirst();
    }

    // 금융망 상품명은 중복될 수 있어 등록 시 보낸 값 전체를 비교한다
    private boolean isSameProduct(SsafyLoanProduct product, Loan loan) {
        return loan.getBankCode().equals(product.getBankCode())
                && loan.getAccountName().equals(product.getAccountName())
                && loan.getRatingName().equals(product.getRatingName())
                && isSameNumber(product.getLoanPeriod(), loan.getPeriod())
                && isSameNumber(product.getMinLoanBalance(), loan.getMinLoanBalance())
                && isSameNumber(product.getMaxLoanBalance(), loan.getMaxLoanBalance())
                && isSameNumber(product.getInterestRate(), loan.getInterestRate());
    }

    // "5" 와 5.0 을 같은 값으로 본다
    private boolean isSameNumber(String financeValue, Number value) {
        try {
            return new BigDecimal(financeValue)
                    .compareTo(new BigDecimal(value.toString())) == 0;
        } catch (NumberFormatException | NullPointerException e) {
            return false;
        }
    }
}
