package com.sobi.global.external.ai.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@Getter
@Setter
@ConfigurationProperties(prefix = "ai")
public class AiProperties {

    private String baseUrl;

    /** RAG 추천은 15~40초 걸린다. 기본값(무한 대기)을 쓰면 안 된다. */
    private Duration readTimeout = Duration.ofSeconds(120);

    /**
     * OCR 서류 검증은 한 장에 10~25초지만, AI 서버가 한 장씩 처리해서 앞선 요청을 기다린다.
     * 서류 여러 장 연속 업로드와 RAG 추천이 겹치면 2분을 넘을 수 있어 RAG 보다 길게 둔다.
     */
    private Duration ocrReadTimeout = Duration.ofSeconds(300);
}