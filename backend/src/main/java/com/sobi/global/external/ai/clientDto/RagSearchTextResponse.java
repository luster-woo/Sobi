package com.sobi.global.external.ai.clientDto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 공고 id 와 유사도만 온다. 판정은 백엔드가 저장된 값으로 붙인다.
 * 순서가 유사도 순이므로 그대로 유지해야 한다.
 */
@Getter
@NoArgsConstructor
public class RagSearchTextResponse {

    private List<Hit> programs;

    @Getter
    @NoArgsConstructor
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class Hit {
        private Long programId;
        private Double distance;
    }
}