package com.sobi.global.external.ssafy.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "ssafy.finance")
public class SsafyFinanceProperties {

    private String baseUrl;
    private String apiKey;
    private String institutionCode;
    private String fintechAppNo;
}