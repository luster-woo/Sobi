package com.sobi.document.write.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Configuration
@EnableConfigurationProperties(DocumentAgentProperties.class)
public class DocumentAgentClientConfig {
    @Bean
    public RestClient documentAgentRestClient(
            @Qualifier("aiRestClient") RestClient aiRestClient,
            DocumentAgentProperties properties
    ) {
        Duration timeout = properties.getReadTimeout();
        if (timeout == null || timeout.isZero() || timeout.isNegative()) {
            throw new IllegalArgumentException("ai.draft.read-timeout must be positive");
        }
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(timeout);
        // 기존 ai.base-url/설정은 재사용하고 RAG/OCR Bean은 변경하지 않는다.
        return aiRestClient.mutate().requestFactory(factory).build();
    }
}
