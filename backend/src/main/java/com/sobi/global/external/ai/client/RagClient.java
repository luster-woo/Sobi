package com.sobi.global.external.ai.client;

import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import com.sobi.global.external.ai.clientDto.RagExplainRequest;
import com.sobi.global.external.ai.clientDto.RagExplainResponse;
import com.sobi.global.external.ai.clientDto.RagRecommendRequest;
import com.sobi.global.external.ai.clientDto.RagRecommendResponse;
import com.sobi.global.external.ai.clientDto.RagSearchTextRequest;
import com.sobi.global.external.ai.clientDto.RagSearchTextResponse;
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

    /**
     * 질의 문장으로 공고를 찾는다. LLM 을 부르지 않아 1초 미만이다.
     */
    public RagSearchTextResponse searchText(RagSearchTextRequest request) {
        try {
            RagSearchTextResponse response = restClient.post()
                    .uri("/rag/search-text")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(RagSearchTextResponse.class);

            if (response == null || response.getPrograms() == null) {
                log.error("AI 검색 응답이 비어 있습니다.");
                throw new BusinessException(ErrorCode.AI_API_ERROR);
            }

            return response;

        } catch (RestClientException e) {
            log.error("AI 검색 호출 실패", e);
            throw new BusinessException(ErrorCode.AI_API_ERROR);
        }
    }

    /**
     * 판정 사유를 문장으로 설명한다. GMS 를 부르므로 2~3초 걸린다.
     *
     * <p><b>이 메서드만 예외를 던지지 않고 null 을 돌려준다.</b> 설명은 부가
     * 정보다. 추천과 검색은 없으면 화면에 보여줄 것이 없지만, 설명은 없어도
     * 기존 reason(템플릿 문장)으로 공고 상세가 온전히 뜬다. 여기서 예외를
     * 올리면 부가 정보 하나 때문에 화면 전체가 죽는다.
     *
     * <p>호출한 쪽은 null 을 받으면 기존 reason 을 그대로 쓰면 된다.
     */
    public String explain(RagExplainRequest request) {
        try {
            RagExplainResponse response = restClient.post()
                    .uri("/rag/explain")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(RagExplainResponse.class);

            if (response == null || response.getExplanation() == null) {
                log.warn("AI 설명 생성 실패 - programId: {}", request.getProgramId());
                return null;
            }
            return response.getExplanation();

        } catch (RestClientException e) {
            log.error("AI 설명 호출 실패 - programId: {}", request.getProgramId(), e);
            return null;
        }
    }
}