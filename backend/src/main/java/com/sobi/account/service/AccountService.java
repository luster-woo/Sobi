package com.sobi.account.service;

import com.sobi.account.dto.AccountResponse;

public interface AccountService {

    AccountResponse getAccountByUserId(Long userId);

}
