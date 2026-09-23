package com.sobi.document.write.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@Getter
@Setter
@ConfigurationProperties(prefix = "ai.draft")
public class DocumentAgentProperties {
    // 여러 GENERATED 필드의 순차 GMS 호출을 고려한 문서 전용 timeout.
    private Duration readTimeout = Duration.ofSeconds(300);
}
