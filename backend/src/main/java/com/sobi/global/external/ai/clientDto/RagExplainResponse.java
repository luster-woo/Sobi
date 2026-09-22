package com.sobi.global.external.ai.clientDto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * POST /rag/explain 응답.
 *
 * <p>AI 쪽이 생성에 실패하면 explanation 이 null 로 온다. 에러가 아니라 정상
 * 응답이다 — 설명은 부가 정보라서 실패해도 화면이 떠야 한다.
 */
@Getter
@NoArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class RagExplainResponse {

    private String explanation;
}
