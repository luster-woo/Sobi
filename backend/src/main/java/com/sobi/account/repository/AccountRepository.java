package com.sobi.account.repository;

import com.sobi.account.entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account, Long> {

    List<Account> findByUserIdAndType(Long userId, String type);

    Account findByAccountNo(String accountNo);

    // 제출 시 선택한 계좌가 본인 것인지 확인하기 위해 사용자까지 조건으로 건다
    Optional<Account> findByIdAndUser_Id(Long id, Long userId);
}
