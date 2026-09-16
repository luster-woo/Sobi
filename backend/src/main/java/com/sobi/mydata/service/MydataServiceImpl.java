package com.sobi.mydata.service;

import com.sobi.global.external.ai.client.RagClient;
import com.sobi.global.external.ai.clientDto.RagRecommendRequest;
import com.sobi.global.external.ai.clientDto.RagRecommendResponse;
import com.sobi.mydata.dto.MydataLinkResponse;
import com.sobi.mydata.dto.MydataSnapshot;
import com.sobi.mydata.store.MydataStore;
import com.sobi.user.client.SsafyUserClient;
import com.sobi.user.clientDto.SsafyDemandDepositAccountRecord;
import com.sobi.user.clientDto.SsafyInquireMyCreditRatingResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 마이데이터 연동 조율.
 *
 * 일부러 @Transactional 을 붙이지 않는다. 금융망과 AI 호출이 수십 초 걸려
 * 트랜잭션 안에 두면 그동안 DB 커넥션과 락을 붙들게 된다.
 * DB 작업은 MydataStore 가 짧은 트랜잭션으로 처리한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MydataServiceImpl implements MydataService {

    private final MydataStore store;
    private final SsafyUserClient ssafyUserClient;
    private final RagClient ragClient;

    @Override
    public MydataLinkResponse link(Long userId) {

        MydataSnapshot snapshot = store.read(userId);

        List<SsafyDemandDepositAccountRecord> accounts = fetchAccounts(snapshot.getUserKey());
        String creditRatingName = fetchCreditRating(snapshot.getUserKey());

        store.saveCollected(snapshot, accounts, creditRatingName);

        long startedAt = System.currentTimeMillis();
        RagRecommendResponse ai = ragClient.recommend(toRagRequest(snapshot));
        log.info("AI 판정 소요 - userId: {}, {}ms", userId, System.currentTimeMillis() - startedAt);

        store.saveJudgements(snapshot.getBusinessId(), ai.getResults());

        return MydataLinkResponse.from(ai.getResults());
    }

    /**
     * 금융망이 실패해도 연동을 중단하지 않는다.
     * 계좌·신용등급은 자격 판정에 쓰이지 않으므로, 매출과 보험만으로도 판정은 성립한다.
     * 비어 있는 값은 마이데이터 갱신 때 다시 채우면 된다.
     */
    private List<SsafyDemandDepositAccountRecord> fetchAccounts(String userKey) {
        try {
            return ssafyUserClient.inquireDemandDepositAccountList(userKey).getRec();
        } catch (RuntimeException e) {
            log.warn("금융망 계좌 조회 실패. 계좌 없이 진행한다", e);
            return List.of();
        }
    }

    private String fetchCreditRating(String userKey) {
        try {
            SsafyInquireMyCreditRatingResponse response = ssafyUserClient.inquireMyCreditRating(userKey);
            return response.getRec() == null ? null : response.getRec().getRatingName();
        } catch (RuntimeException e) {
            log.warn("금융망 신용등급 조회 실패. 등급 없이 진행한다", e);
            return null;
        }
    }

    private RagRecommendRequest toRagRequest(MydataSnapshot snapshot) {
        return RagRecommendRequest.builder()
                .region(snapshot.getRegion())
                .address(snapshot.getAddress())
                .businessCode(snapshot.getBusinessCode())
                .employeeCount(snapshot.getEmployeeCount())
                .openDate(snapshot.getOpenDate())
                .annualRevenue(snapshot.getAnnualRevenue())
                .birthDate(snapshot.getBirthDate())
                .build();
    }
}