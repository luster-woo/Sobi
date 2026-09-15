package com.sobi.loan.service;

import com.sobi.business.entity.BusinessInfo;
import com.sobi.loan.dto.EligibilityResult;
import com.sobi.loan.entity.Loan;
import com.sobi.user.entity.CreditRating;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.Period;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

/**
 * 대출 상품의 우리 쪽 신청 조건 판정. 목록·상세가 같은 결과를 내도록 한 곳에서 계산한다.
 * 최종 승인은 신청 시 금융망 심사(2.7.5) 결과로 확정된다.
 */
@Component
public class LoanEligibilityChecker {

    private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");

    /**
     * @param userRating 마이데이터 조회 시 채워지는 사용자 신용등급
     * @param business   사업자 정보. 예비창업자는 null (업력 0년, 근로자 0명)
     */
    public EligibilityResult check(Loan loan, CreditRating userRating, BusinessInfo business) {

        List<String> reasons = new ArrayList<>();

        // 신용등급: enum 이 A -> E 순서라 ordinal 이 클수록 낮은 등급
        CreditRating requiredRating = CreditRating.valueOf(loan.getRatingName());

        if (userRating == null || userRating.compareTo(requiredRating) > 0) {
            reasons.add(String.format("신용등급 %s 이상 필요 (현재 %s)",
                    requiredRating, userRating == null ? "등급 없음" : userRating));
        }

        // 사업 개시: 사업자 정보가 있어야 한다
        if (loan.getIsStart() && business == null) {
            reasons.add("사업 개시 후 신청 가능");
        }

        // 업력: 개업일부터 오늘까지 만 년수
        int firmAge = business == null
                ? 0
                : Period.between(business.getOpenDate(), LocalDate.now(KOREA_ZONE)).getYears();

        if (firmAge < loan.getFirmAge()) {
            reasons.add(String.format("업력 %d년 이상 필요 (현재 %d년)", loan.getFirmAge(), firmAge));
        }

        // 근로자: 1명 이상 고용
        if (loan.getEmployeeNum() && (business == null || business.getEmployeeCount() < 1)) {
            reasons.add("근로자 1명 이상 고용 필요");
        }

        return EligibilityResult.from(reasons);
    }
}
