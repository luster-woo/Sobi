package com.sobi.user.dto;

import com.sobi.business.entity.BusinessInfo;
import com.sobi.user.entity.Provider;
import com.sobi.user.entity.Role;
import com.sobi.user.entity.User;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 마이페이지 화면 전체.
 *
 * 계좌 잔액·대출금은 저장하지 않고 조회 시점에 금융망에서 받아온다.
 */
@Getter
@Builder
public class MyPageResponse {

    private final Long userId;
    private final String name;
    private final String email;
    private final LocalDate birthDate;
    private final Role role;
    private final Provider provider;
    private final boolean notification;

    /** 예비창업자면 null */
    private final BusinessSummary business;

    private final MyDataStatus myData;
    private final AccountSummary accountSummary;

    /** 대출이 없으면 null */
    private final PayoutAccount payoutAccount;

    @Getter
    @Builder
    public static class BusinessSummary {

        private final String businessName;
        private final String brn;

        /** business_info 에 대표자명이 없어 users.name 을 쓴다 */
        private final String ownerName;

        /** minor_code.name (예: 한식음식점) */
        private final String industryName;

        private final String address;
        private final LocalDate openDate;

        public static BusinessSummary of(BusinessInfo business, String ownerName) {
            return BusinessSummary.builder()
                    .businessName(business.getBusinessName())
                    .brn(business.getBrn())
                    .ownerName(ownerName)
                    .industryName(business.getBusinessCode().getName())
                    .address(business.getAddress())
                    .openDate(business.getOpenDate())
                    .build();
        }
    }

    @Getter
    @Builder
    public static class MyDataStatus {

        private final boolean linked;

        /**
         * 마지막 연동 시각. 판정 시각으로 대신한다.
         * 수집과 판정이 한 흐름이라 사실상 같은 시각이다.
         */
        private final LocalDateTime updatedAt;
    }

    /** 금융망 실시간 조회. 호출이 실패하면 전부 0 이다 */
    @Getter
    @Builder
    public static class AccountSummary {

        private final long totalBalance;
        private final long totalLoanBalance;
        private final int accountCount;

        /** 입출금 계좌의 은행 수 */
        private final int institutionCount;
    }

    /** 대출금이 나가고 들어오는 입출금 계좌. 마스킹은 화면에서 한다 */
    @Getter
    @Builder
    public static class PayoutAccount {

        private final String bankName;
        private final String accountNo;
    }

    public static MyPageResponse of(
            User user,
            BusinessSummary business,
            MyDataStatus myData,
            AccountSummary accountSummary,
            PayoutAccount payoutAccount
    ) {
        return MyPageResponse.builder()
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .birthDate(user.getBirthDate())
                .role(user.getRole())
                .provider(user.getProvider())
                .notification(user.isNotification())
                .business(business)
                .myData(myData)
                .accountSummary(accountSummary)
                .payoutAccount(payoutAccount)
                .build();
    }
}