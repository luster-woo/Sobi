package com.sobi.loan.clientDto;

import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 신용등급 기준 조회 응답의 등급 정보.
 * 사용자의 수시입출금 + 예·적금 합계가 min~max 사이면 해당 등급이 된다.
 */
@Getter
@NoArgsConstructor
public class SsafyCreditRating {

    private String ratingUniqueNo;  // 상품 등록 시 전달하는 등급 고유번호
    private String ratingName;      // A ~ E
    private String minAssetValue;
    private String maxAssetValue;
}
