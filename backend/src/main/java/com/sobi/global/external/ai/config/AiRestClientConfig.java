package com.sobi.global.external.ai.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Configuration
public class AiRestClientConfig {

    @Bean
    @Qualifier("aiRestClient")
    public RestClient aiRestClient(
            RestClient.Builder builder,
            AiProperties properties
    ) {
        return build(builder, properties, properties.getReadTimeout());
    }

    // OCR 서류 검증 전용. 읽기 타임아웃만 다르다 (ai.ocr-read-timeout)
    @Bean
    @Qualifier("aiOcrRestClient")
    public RestClient aiOcrRestClient(
            RestClient.Builder builder,
            AiProperties properties
    ) {
        return build(builder, properties, properties.getOcrReadTimeout());
    }

    // RestClient.Builder 빈은 프로토타입이라 빈마다 새 빌더가 주입된다
    private RestClient build(RestClient.Builder builder, AiProperties properties, Duration readTimeout) {

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(readTimeout);

        return builder
                .baseUrl(properties.getBaseUrl())
                .requestFactory(factory)
                .defaultHeader("Accept", MediaType.APPLICATION_JSON_VALUE)
                .build();
    }
}