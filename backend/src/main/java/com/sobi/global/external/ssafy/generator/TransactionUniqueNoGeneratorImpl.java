package com.sobi.global.external.ssafy.generator;



import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Component
public class TransactionUniqueNoGeneratorImpl
        implements TransactionUniqueNoGenerator {

    private static final ZoneId KOREA_ZONE =
            ZoneId.of("Asia/Seoul");

    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private String lastTimestamp = "";
    private int sequence = 0;

    @Override
    public synchronized String generate() {

        String currentTimestamp =
                LocalDateTime.now(KOREA_ZONE)
                        .format(FORMATTER);

        // 초가 바뀌면 일련번호 초기화
        if (!currentTimestamp.equals(lastTimestamp)) {
            lastTimestamp = currentTimestamp;
            sequence = 0;
        }

        sequence++;

        if (sequence > 999999) {
            throw new IllegalStateException(
                    "1초당 거래 고유번호 생성 한도를 초과했습니다."
            );
        }

        return currentTimestamp
                + String.format("%06d", sequence);
    }
}