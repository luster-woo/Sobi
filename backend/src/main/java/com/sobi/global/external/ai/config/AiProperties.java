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
}