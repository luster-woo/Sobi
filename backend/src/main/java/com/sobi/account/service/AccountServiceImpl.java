package com.sobi.account.service;

import com.sobi.account.dto.AccountList;
import com.sobi.account.dto.AccountResponse;
import com.sobi.account.entity.Account;
import com.sobi.account.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class AccountServiceImpl implements AccountService {

    private final AccountRepository accountRepository;


    @Override
    public AccountResponse getAccountByUserId(Long userId) {

        // 유저 아이디 기반 어카운트 리스트를 가져오고
        List<Account> accounts = accountRepository.findByUserIdAndType(userId, "COMMON");

        List<AccountList> accountList = new ArrayList<>();
        // 어카운트 리스트를 accountlist로 변환
        for(Account account : accounts){
            accountList.add(AccountList.from(account));
        }

        // accountResponse 생성
        AccountResponse response = AccountResponse.builder()
                .accountList(accountList)
                .build();

        // 리턴
        return response;
    }
}
