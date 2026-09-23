//package com.sobi.funding.service;
//
//import com.sobi.funding.domain.FundingCandidate;
//import org.junit.jupiter.api.Test;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.boot.test.context.SpringBootTest;
//import org.springframework.transaction.annotation.Transactional;
//
//import java.util.List;
//
//@SpringBootTest
//@Transactional
//class FundingServiceTest {
//
//    @Autowired
//    private FundingService fundingService;
//
//    @Test
//    void 추천_후보_조회() {
//
//        // given
//        Long businessId = 1L;
//
//        // when
//        List<FundingCandidate> candidates =
//                fundingService.getFundingCandidates(
//                        businessId
//                );
//
//        // then
//        for (FundingCandidate candidate : candidates) {
//
//            System.out.println(
//                    candidate.sourceType()
//                            + " / "
//                            + candidate.fundingType()
//                            + " / "
//                            + candidate.name()
//                            + " / "
//                            + candidate.minAmount()
//                            + " ~ "
//                            + candidate.maxAmount()
//                            + " / "
//                            + candidate.interestRate()
//                            + "%"
//            );
//        }
//    }
//}