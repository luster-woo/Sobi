package com.sobi.application.service;

import com.sobi.application.entity.ValidationStatus;
import com.sobi.application.repository.ApplicationDocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

/**
 * 검증 대기·진행 상태로 오래 멈춘 서류를 실패 처리한다.
 * AI 서버 장애로 응답이 안 오거나 검증 작업이 시작되기 전에 서버가 재시작되면 상태가 풀리지 않아,
 * 사용자가 재업로드(409)도 제출도 못 하게 된다.
 *
 * 10분은 AI 호출 타임아웃(ai.ocr-read-timeout, 5분)보다 충분히 길다. 늦게 도착한 결과는 조건부 저장에서 버려진다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DocumentValidationTimeoutScheduler {

    private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");

    static final Duration TIMEOUT = Duration.ofMinutes(10);
    static final String MESSAGE_TIMEOUT = "검증 시간이 초과되었습니다. 다시 업로드해 주세요.";

    private static final List<String> STUCK_STATUSES =
            List.of(ValidationStatus.PENDING.name(), ValidationStatus.VALIDATING.name());

    private final ApplicationDocumentRepository applicationDocumentRepository;

    @Scheduled(initialDelay = 60_000, fixedDelay = 60_000)
    public void expireStaleValidations() {
        LocalDateTime now = LocalDateTime.now(KOREA_ZONE);

        int expired = applicationDocumentRepository.expireStaleValidations(
                STUCK_STATUSES, ValidationStatus.FAILED.name(), MESSAGE_TIMEOUT, now.minus(TIMEOUT), now);

        if (expired > 0) {
            log.warn("서류 검증 시간 초과 처리 {}건", expired);
        }
    }
}
