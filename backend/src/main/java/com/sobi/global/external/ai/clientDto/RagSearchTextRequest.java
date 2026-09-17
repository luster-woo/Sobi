package com.sobi.global.external.ai.clientDto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class RagSearchTextRequest {

    private final String query;

    /**
     * 돌려받을 공고 수 상한. 거리 임계값이 먼저 자르므로 보통 더 적게 온다.
     *
     * primitive 로 두면 빌더에서 빼먹었을 때 0 이 나가고, AI 가 ge=1 위반으로
     * 422 를 준다. 그러면 사용자에게 500 으로 보인다.
     */
    @Builder.Default
    private final Integer topK = 20;
}