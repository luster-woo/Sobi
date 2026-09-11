package com.sobi.global.external.ssafy.client.member;

import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import com.sobi.global.external.ssafy.config.SsafyFinanceProperties;
import com.sobi.global.external.ssafy.header.SsafyErrorResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

/**
 * 금융망 사용자 계정 API (/member, /member/search).
 * 다른 금융 API와 달리 Header 없이 { apiKey, userId } 형식이라 SsafyFinanceClient를 쓰지 않는다.
 */
@Slf4j
@Component
public class SsafyMemberClient {

    private static final String DUPLICATE_ID_CODE = "E4002";

    private final RestClient restClient;
    private final SsafyFinanceProperties properties;

    public SsafyMemberClient(
            @Qualifier("ssafyFinanceRestClient") RestClient restClient,
            SsafyFinanceProperties properties
    ) {
        this.restClient = restClient;
        this.properties = properties;
    }

    /**
     * 계정 생성 후 userKey 반환. 이미 존재하는 이메일(E4002)이면 조회로 userKey 회수.
     */
    public String getOrCreateUserKey(String email) {
        try {
            return post("/member/", email).getUserKey();
        } catch (RestClientResponseException e) {
            if (isDuplicateId(e)) {
                log.info("금융망에 이미 등록된 이메일 - 조회로 전환. email={}", email);
                return searchUserKey(email);
            }
            throw toBusinessException("/member/", e);
        } catch (RestClientException e) {
            log.error("금융망 통신 오류. uri=/member/", e);
            throw new BusinessException(ErrorCode.FINANCE_API_ERROR);
        }
    }

    private String searchUserKey(String email) {
        try {
            return post("/member/search", email).getUserKey();
        } catch (RestClientResponseException e) {
            throw toBusinessException("/member/search", e);
        } catch (RestClientException e) {
            log.error("금융망 통신 오류. uri=/member/search", e);
            throw new BusinessException(ErrorCode.FINANCE_API_ERROR);
        }
    }

    private SsafyMemberResponse post(String uri, String email) {
        SsafyMemberResponse response = restClient.post()
                .uri(uri)
                .contentType(MediaType.APPLICATION_JSON)
                .body(new SsafyMemberRequest(properties.getApiKey(), email))
                .retrieve()
                .body(SsafyMemberResponse.class);

        if (response == null || response.getUserKey() == null) {
            log.error("금융망 응답에 userKey 없음. uri={}", uri);
            throw new BusinessException(ErrorCode.FINANCE_API_ERROR);
        }
        return response;
    }

    private boolean isDuplicateId(RestClientResponseException e) {
        try {
            SsafyErrorResponse error = e.getResponseBodyAs(SsafyErrorResponse.class);
            return error != null && DUPLICATE_ID_CODE.equals(error.getResponseCode());
        } catch (Exception ex) {
            return false;   // body 파싱 실패 → 중복 아님으로 처리
        }
    }

    private BusinessException toBusinessException(String uri, RestClientResponseException e) {
        log.error("금융망 HTTP 오류. uri={}, status={}, body={}",
                uri, e.getStatusCode(), e.getResponseBodyAsString());
        return new BusinessException(ErrorCode.FINANCE_API_ERROR);
    }
}