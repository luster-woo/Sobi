package com.sobi.user.clientDto;

import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 내 신용등급 (LOAN_04 의 REC).
 * 수시입출금·예적금 자산을 합산해 신용등급 기준에 해당하는 등급이 내려온다.
 */
@Getter
@NoArgsConstructor
public class SsafyMyCreditRating {

    /** A ~ E */
    private String ratingName;

    private Long demandDepositAssetValue;

    private Long depositSavingsAssetValue;

    private Long totalAssetValue;
}