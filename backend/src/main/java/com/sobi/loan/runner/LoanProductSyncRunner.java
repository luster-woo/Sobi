package com.sobi.loan.runner;

import com.sobi.loan.service.LoanProductSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 부팅 시 추가된 대출 상품을 금융망에 등록
 * 금융망 장애로 서버 부팅이 막히지 않도록 실패는 로그만 남긴다.
 * 끄려면 LOAN_PRODUCT_SYNC_ENABLED=false
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(
        name = "loan.product-sync.enabled",
        havingValue = "true",
        matchIfMissing = true
)
public class LoanProductSyncRunner implements ApplicationRunner {

    private final LoanProductSyncService loanProductSyncService;

    @Override
    public void run(ApplicationArguments args) {
        try {
            loanProductSyncService.syncUnregisteredProducts();
        } catch (RuntimeException e) {
            log.error("대출 상품 동기화 중단 - 다음 부팅 시 재시도", e);
        }
    }
}
