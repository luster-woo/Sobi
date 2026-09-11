package com.sobi.global.external.ssafy.header;

import com.sobi.global.external.ssafy.config.SsafyFinanceProperties;
import com.sobi.global.external.ssafy.generator.TransactionUniqueNoGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Component
@RequiredArgsConstructor
public class SsafyHeaderFactory {

    private final SsafyFinanceProperties properties;
    private final TransactionUniqueNoGenerator uniqueNoGenerator;

    private static final ZoneId KOREA_ZONE =
            ZoneId.of("Asia/Seoul");

    private static final DateTimeFormatter DATE_FORMATTER =
            DateTimeFormatter.ofPattern("yyyyMMdd");

    private static final DateTimeFormatter TIME_FORMATTER =
            DateTimeFormatter.ofPattern("HHmmss");

    public SsafyRequestHeader create(
            SsafyFinanceApi api,
            String userKey
    ) {

        LocalDateTime now =
                LocalDateTime.now(KOREA_ZONE);

        String apiKey = null;
        String finalUserKey = null;

        switch (api.getAuthType()) {

            case NONE -> {
            }

            case API_KEY -> {
                apiKey = properties.getApiKey();
            }

            case USER_KEY -> {
                validateUserKey(userKey);
                finalUserKey = userKey;
            }

            case BOTH -> {
                validateUserKey(userKey);

                apiKey = properties.getApiKey();
                finalUserKey = userKey;
            }
        }

        return SsafyRequestHeader.builder()
                .apiName(api.getApiName())
                .transmissionDate(
                        now.format(DATE_FORMATTER)
                )
                .transmissionTime(
                        now.format(TIME_FORMATTER)
                )
                .institutionCode(
                        properties.getInstitutionCode()
                )
                .fintechAppNo(
                        properties.getFintechAppNo()
                )
                .apiServiceCode(
                        api.getApiServiceCode()
                )
                .institutionTransactionUniqueNo(
                        uniqueNoGenerator.generate()
                )
                .apiKey(apiKey)
                .userKey(finalUserKey)
                .build();
    }

    private void validateUserKey(String userKey) {

        if (userKey == null || userKey.isBlank()) {
            throw new IllegalArgumentException(
                    "해당 SSAFY 금융 API 호출에는 userKey가 필요합니다."
            );
        }
    }
}