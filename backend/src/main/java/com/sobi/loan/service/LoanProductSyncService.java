package com.sobi.loan.service;

public interface LoanProductSyncService {

    // 금융망 고유번호가 없는 대출 상품을 금융망과 연결 (없으면 등록)
    void syncUnregisteredProducts();
}
