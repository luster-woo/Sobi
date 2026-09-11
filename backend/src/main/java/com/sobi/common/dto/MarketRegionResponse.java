package com.sobi.common.dto;

import java.util.List;

/** 지역 셀렉트 박스 채우기용 목록. 자치구별로 행정동을 묶어서 내린다. */
public record MarketRegionResponse(
        String cityName,
        List<District> districts
) {

    public record District(
            String code,
            String name,
            List<Dong> dongs
    ) {
    }

    public record Dong(
            String code,
            String name
    ) {
    }
}
