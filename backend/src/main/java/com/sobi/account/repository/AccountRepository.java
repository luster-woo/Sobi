package com.sobi.account.repository;

import com.sobi.account.entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AccountRepository extends JpaRepository<Account, Long> {

    List<Account> findByUserIdAndType(Long userId, String type);
}
