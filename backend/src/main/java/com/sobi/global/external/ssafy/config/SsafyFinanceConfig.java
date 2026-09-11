package com.sobi.global.external.ssafy.config;


import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(SsafyFinanceProperties.class)
public class SsafyFinanceConfig {
}