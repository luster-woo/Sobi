package com.sobi.common.dto;

/** 행정동 목록 조회용 조회 결과 한 줄. JPQL 생성자 표현식에서 직접 만든다. */
public record DongItem(
        String districtCode,
        String districtName,
        String dongCode,
        String dongName
) {
}
