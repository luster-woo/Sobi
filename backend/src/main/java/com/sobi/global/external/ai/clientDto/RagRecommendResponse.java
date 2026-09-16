package com.sobi.global.external.ai.clientDto;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 공고 222건이 전부 담긴다. SQL 필터 탈락분도 사유와 함께 온다.
 */
@Getter
@NoArgsConstructor
public class RagRecommendResponse {

    /** 프로필로 만든 검색 질의문. 디버깅용. */
    private String query;

    private List<RagResult> results;
}