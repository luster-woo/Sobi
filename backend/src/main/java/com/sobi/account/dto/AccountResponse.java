package com.sobi.account.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class AccountResponse {

    List<AccountList> accountList;

}
