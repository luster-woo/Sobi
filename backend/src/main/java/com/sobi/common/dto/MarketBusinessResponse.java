package com.sobi.common.dto;

import java.util.List;

/** 업종 셀렉트 박스 채우기용 목록. 대분류 - 중분류 - 소분류 3단 트리 */
public record MarketBusinessResponse(
        List<Major> majors
) {

    public record Major(
            String code,
            String name,
            List<Sub> subs
    ) {
    }

    public record Sub(
            String code,
            String name,
            List<Minor> minors
    ) {
    }

    public record Minor(
            String code,
            String name
    ) {
    }
}
