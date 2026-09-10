package com.sobi.global.external.ssafy.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@Slf4j
@Component
public class SsafyFinanceClient {

    private static final String SUCCESS_CODE = "H0000";

    private final RestClient restClient;

    public SsafyFinanceClient(
            @Qualifier("ssafyFinanceRestClient")
            RestClient restClient
    ) {
        this.restClient = restClient;
    }

    public <T extends SsafyFinanceResponse> T post(
            String uri,
            Object request,
            Class<T> responseType
    ) {

        try {

            T response = restClient.post()
                    .uri(uri)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(responseType);

            if (response == null) {
                throw new IllegalStateException(
                        "SSAFY 금융 API 응답이 존재하지 않습니다."
                );
            }

            validateResponse(response);

            return response;

        } catch (RestClientResponseException e) {

            log.error(
                    "SSAFY 금융 API HTTP 오류 - uri: {}, status: {}, response: {}",
                    uri,
                    e.getStatusCode(),
                    e.getResponseBodyAsString()
            );

            throw new RuntimeException(
                    "SSAFY 금융 API 호출에 실패했습니다.",
                    e
            );

        } catch (RestClientException e) {

            log.error(
                    "SSAFY 금융 API 통신 오류 - uri: {}",
                    uri,
                    e
            );

            throw new RuntimeException(
                    "SSAFY 금융 API 서버와 통신할 수 없습니다.",
                    e
            );
        }
    }

    private void validateResponse(
            SsafyFinanceResponse response
    ) {

        if (response.getHeader() == null) {
            throw new IllegalStateException(
                    "SSAFY 금융 API 응답 Header가 존재하지 않습니다."
            );
        }

        String responseCode =
                response.getHeader().getResponseCode();

        if (!SUCCESS_CODE.equals(responseCode)) {

            String responseMessage =
                    response.getHeader().getResponseMessage();

            log.error(
                    "SSAFY 금융 API 처리 실패 - code: {}, message: {}",
                    responseCode,
                    responseMessage
            );

            throw new RuntimeException(
                    "금융 API 처리에 실패했습니다. "
                            + responseMessage
            );
        }
    }
}