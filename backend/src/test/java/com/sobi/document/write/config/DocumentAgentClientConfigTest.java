package com.sobi.document.write.config;

import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.time.Duration;

import static org.assertj.core.api.Assertions.*;

class DocumentAgentClientConfigTest {
    @Test
    void independentTimeoutAndClient() {
        var original=RestClient.builder().baseUrl("http://agent").build();
        var properties=new DocumentAgentProperties();
        assertThat(properties.getReadTimeout()).isEqualTo(Duration.ofSeconds(300));
        assertThat(new DocumentAgentClientConfig().documentAgentRestClient(original,properties)).isNotSameAs(original);
    }

    @Test
    void infiniteOrNegativeTimeoutRejected() {
        var original=RestClient.builder().baseUrl("http://agent").build();
        var properties=new DocumentAgentProperties();
        properties.setReadTimeout(Duration.ZERO);
        assertThatThrownBy(() -> new DocumentAgentClientConfig().documentAgentRestClient(original,properties))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
