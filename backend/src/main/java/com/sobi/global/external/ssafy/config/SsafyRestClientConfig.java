package com.sobi.global.external.ssafy.config;



import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

@Configuration
public class SsafyRestClientConfig {

    @Bean
    @Qualifier("ssafyFinanceRestClient")
    public RestClient ssafyFinanceRestClient(
            RestClient.Builder builder,
            SsafyFinanceProperties properties
    ) {

        return builder
                .baseUrl(properties.getBaseUrl())
                .defaultHeader(
                        "Accept",
                        MediaType.APPLICATION_JSON_VALUE
                )
                .build();
    }
}