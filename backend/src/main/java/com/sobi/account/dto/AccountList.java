package com.sobi.account.dto;


import com.sobi.account.entity.Account;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder

public class AccountList {

    private String bankName;

    private String accountNo;


    public static AccountList from(Account account){
        return AccountList.builder()
                .bankName(account.getBankName())
                .accountNo(account.getAccountNo())
                .build();

    }

}
