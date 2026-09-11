package com.sobi.auth.oauth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Base64;

/**
 * 구글 OAuth 인가 코드 → id_token 교환 후 사용자 정보 추출.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GoogleOAuthClient {

    private final GoogleOAuthProperties properties;
    private final ObjectMapper objectMapper;

    private final RestClient restClient = RestClient.create();

    public GoogleUserInfo getUserInfo(String code, String redirectUri) {
        String idToken = exchangeCode(code, redirectUri);
        return parseIdToken(idToken);
    }

    private String exchangeCode(String code, String redirectUri) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("code", code);
        form.add("client_id", properties.getClientId());
        form.add("client_secret", properties.getClientSecret());
        form.add("redirect_uri", redirectUri);
        form.add("grant_type", "authorization_code");

        try {
            JsonNode body = restClient.post()
                    .uri(properties.getTokenUri())
                    .body(form)
                    .retrieve()
                    .body(JsonNode.class);

            if (body == null || !body.hasNonNull("id_token")) {
                log.error("구글 토큰 응답에 id_token 없음. body={}", body);
                throw new BusinessException(ErrorCode.OAUTH_CODE_INVALID);
            }
            return body.get("id_token").asText();

        } catch (RestClientException e) {
            log.error("구글 토큰 교환 실패. message={}", e.getMessage());
            throw new BusinessException(ErrorCode.OAUTH_CODE_INVALID);
        }
    }

    /**
     * id_token(JWT) payload에서 sub/email/name 추출.
     * 구글 토큰 엔드포인트에서 TLS로 직접 받은 토큰이라 서명 검증은 생략 (OIDC 스펙 권장).
     */
    private GoogleUserInfo parseIdToken(String idToken) {
        try {
            String payload = idToken.split("\\.")[1];
            JsonNode claims = objectMapper.readTree(
                    Base64.getUrlDecoder().decode(payload)
            );

            String email = claims.path("email").asText(null);
            if (email == null) {
                throw new BusinessException(ErrorCode.OAUTH_CODE_INVALID);
            }

            return new GoogleUserInfo(
                    claims.path("sub").asText(null),
                    email,
                    claims.path("name").asText(email.split("@")[0])   // name 없으면 이메일 앞부분
            );

        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("구글 id_token 파싱 실패", e);
            throw new BusinessException(ErrorCode.OAUTH_CODE_INVALID);
        }
    }
}