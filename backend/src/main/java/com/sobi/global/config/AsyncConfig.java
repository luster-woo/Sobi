package com.sobi.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
@EnableAsync
public class AsyncConfig {

    public static final String DOCUMENT_VALIDATION_EXECUTOR = "documentValidationExecutor";

    /**
     * 서류 검증(AI OCR 호출) 전용 스레드 풀.
     * 한 작업이 AI 응답을 최대 ai.ocr-read-timeout(5분)까지 기다리므로 다른 비동기 작업과 풀을 나눈다.
     * AI 서버가 OCR 을 한 장씩 처리해서 스레드를 늘려도 빨라지지는 않는다.
     */
    @Bean(name = DOCUMENT_VALIDATION_EXECUTOR)
    public ThreadPoolTaskExecutor documentValidationExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("doc-validate-");
        return executor;
    }
}
