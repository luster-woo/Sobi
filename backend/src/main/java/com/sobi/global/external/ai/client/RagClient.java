package com.sobi.global.external.ai.client;

import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import com.sobi.global.external.ai.clientDto.RagRecommendRequest;
import com.sobi.global.external.ai.clientDto.RagRecommendResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Slf4j
@Component
public class RagClient {

    private final RestClient restClient;

    // 필드에 @Qualifier 를 붙이고 @RequiredArgsConstructor 를 쓰면
    // Lombok 이 한정자를 생성자로 옮기지 않아 RestClient 빈 주입이 실패한다.
    // SsafyFinanceClient 와 같은 이유로 생성자를 직접 쓴다.
    public RagClient(
            @Qualifier("aiRestClient")
            RestClient restClient
    ) {
        this.restClient = restClient;
    }

    /**
     * 사업자 프로필로 지원사업 전량을 판정한다. 15~40초 걸린다.
     */
    public RagRecommendResponse recommend(RagRecommendRequest request) {
        try {
            RagRecommendResponse response = restClient.post()
                    .uri("/rag/recommend")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(RagRecommendResponse.class);

            if (response == null || response.getResults() == null) {
                log.error("AI 추천 응답이 비어 있습니다.");
                throw new BusinessException(ErrorCode.AI_API_ERROR);
            }

            log.info("AI 추천 완료 - 공고 {}건", response.getResults().size());
            return response;

        } catch (RestClientException e) {
            log.error("AI 추천 호출 실패", e);
            throw new BusinessException(ErrorCode.AI_API_ERROR);
        }
    }
}