package com.sobi.mydata.store;

import com.sobi.account.entity.Account;
import com.sobi.account.repository.AccountRepository;
import com.sobi.business.entity.BusinessInfo;
import com.sobi.business.entity.BusinessTax;
import com.sobi.business.repository.BusinessReporitory;
import com.sobi.business.repository.BusinessTaxRepository;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import com.sobi.global.external.ai.clientDto.RagResult;
import com.sobi.insurance.entity.Insurance;
import com.sobi.insurance.entity.InsuranceChecklist;
import com.sobi.insurance.entity.InsuranceStatus;
import com.sobi.insurance.repository.InsuranceChecklistRepository;
import com.sobi.insurance.repository.InsuranceRepository;
import com.sobi.mydata.dto.MydataSnapshot;
import com.sobi.mydata.entity.Mydata;
import com.sobi.mydata.repository.MydataInsuranceRepository;
import com.sobi.mydata.repository.MydataRepository;
import com.sobi.mydata.repository.MydataTaxRepository;
import com.sobi.support.entity.SuggestSupportProgram;
import com.sobi.support.repository.SuggestSupportProgramRepository;
import com.sobi.support.repository.SupportProgramRepository;
import com.sobi.user.clientDto.SsafyDemandDepositAccountRecord;
import com.sobi.user.entity.CreditRating;
import com.sobi.user.entity.User;
import com.sobi.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 마이데이터 연동의 DB 작업을 모아둔다.
 *
 * 외부 호출(금융망·AI)은 수십 초가 걸려 트랜잭션 안에 둘 수 없다.
 * 그래서 조율은 MydataServiceImpl 이 하고, 짧은 트랜잭션만 여기서 연다.
 * 같은 빈 안에서 호출하면 프록시를 타지 않으므로 클래스를 분리해야 한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MydataStore {

    /** 수시입출금 계좌. account.type 에 쓰는 값 */
    private static final String ACCOUNT_TYPE_COMMON = "COMMON";

    /** 마이데이터에 가입 기록이 없는 보험의 초기 상태 */
    private static final InsuranceStatus NOT_JOINED_STATUS = InsuranceStatus.NEEDS_VERIFICATION;

    /** suggest_support_program.reason 컬럼 길이 */
    private static final int REASON_MAX_LENGTH = 500;

    /** status CHECK 제약이 허용하는 값 */
    private static final Set<String> VALID_STATUS = Set.of("eligible", "unknown", "ineligible");

    private final UserRepository userRepository;
    private final BusinessReporitory businessRepository;
    private final BusinessTaxRepository businessTaxRepository;
    private final MydataRepository mydataRepository;
    private final MydataTaxRepository mydataTaxRepository;
    private final MydataInsuranceRepository mydataInsuranceRepository;
    private final InsuranceRepository insuranceRepository;
    private final InsuranceChecklistRepository insuranceChecklistRepository;
    private final AccountRepository accountRepository;
    private final SupportProgramRepository supportProgramRepository;
    private final SuggestSupportProgramRepository suggestSupportProgramRepository;

    /**
     * 연동에 필요한 값을 한 번에 읽는다.
     */
    @Transactional(readOnly = true)
    public MydataSnapshot read(Long userId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NO_USER));

        BusinessInfo business = businessRepository.findByUserId(userId);
        if (business == null) {
            throw new BusinessException(ErrorCode.BUSINESS_INFO_NOT_FOUND);
        }

        Mydata mydata = mydataRepository.findByBrn(business.getBrn())
                .orElseThrow(() -> new BusinessException(ErrorCode.MYDATA_NOT_FOUND));

        List<MydataSnapshot.MonthlyTax> taxes =
                mydataTaxRepository.findByMydataIdOrderByPeriodAsc(mydata.getId()).stream()
                        .map(t -> MydataSnapshot.MonthlyTax.builder()
                                .period(t.getPeriod())
                                .revenue(t.getRevenue())
                                .tax(t.getTax())
                                .build())
                        .toList();

        List<Long> joinedInsuranceIds =
                mydataInsuranceRepository.findAllByMydataId(mydata.getId()).stream()
                        .map(mi -> mi.getInsurance().getId())
                        .toList();

        return MydataSnapshot.builder()
                .userId(user.getId())
                .userKey(user.getUserKey())
                .birthDate(user.getBirthDate())
                .businessId(business.getId())
                .businessCodeId(business.getBusinessCode().getId())
                .businessCode(business.getBusinessCode().getCode())
                .region(business.getRegion())
                .address(business.getAddress())
                .employeeCount(business.getEmployeeCount())
                .openDate(business.getOpenDate())
                .taxes(taxes)
                .joinedInsuranceIds(joinedInsuranceIds)
                .annualRevenue(sumRecentTwelveMonths(taxes))
                .build();
    }

    /** 마지막 판정 시각. 갱신 쿨다운 판단용. */
    @Transactional(readOnly = true)
    public Optional<LocalDateTime> findLastJudgedAt(Long businessId) {
        return suggestSupportProgramRepository.findLastJudgedAt(businessId);
    }

    /**
     * 수집한 값을 적재한다. 매출은 지우고 다시 넣고, 계좌는 없는 것만 더한다.
     */
    @Transactional
    public void saveCollected(MydataSnapshot snapshot,
                              List<SsafyDemandDepositAccountRecord> accounts,
                              String creditRatingName) {

        BusinessInfo business = businessRepository.getReferenceById(snapshot.getBusinessId());
        User user = userRepository.getReferenceById(snapshot.getUserId());

        saveTaxes(business, snapshot);
        saveInsuranceChecklist(business, snapshot);
        saveAccounts(user, accounts);
        saveCreditRating(user, creditRatingName);
    }

    /**
     * 갱신용. 보험 체크리스트만 다르게 다루고 나머지는 최초 연동과 같다.
     */
    @Transactional
    public void refreshCollected(MydataSnapshot snapshot,
                                 List<SsafyDemandDepositAccountRecord> accounts,
                                 String creditRatingName) {

        BusinessInfo business = businessRepository.getReferenceById(snapshot.getBusinessId());
        User user = userRepository.getReferenceById(snapshot.getUserId());

        saveTaxes(business, snapshot);
        upgradeInsuranceChecklist(business, snapshot);
        saveAccounts(user, accounts);
        saveCreditRating(user, creditRatingName);
    }

    /**
     * AI 판정 결과 222건을 저장한다. 기존 행은 지우고 다시 넣는다.
     *
     * upsert 가 아니라 삭제 후 재삽입인 이유: 공고가 청킹 전이거나 삭제되면
     * 응답에서 빠지는데, upsert 면 예전 판정이 유령으로 남는다.
     */
    @Transactional
    public void saveJudgements(Long businessId, List<RagResult> results) {

        suggestSupportProgramRepository.deleteAllByBusinessId(businessId);

        BusinessInfo business = businessRepository.getReferenceById(businessId);

        List<SuggestSupportProgram> rows = results.stream()
                .map(r -> SuggestSupportProgram.of(
                        supportProgramRepository.getReferenceById(r.getProgramId()),
                        business,
                        normalizeStatus(r),
                        truncateReason(r.getReason()),
                        r.getCheckItems(),
                        r.getBenefits(),
                        r.getDistance(),
                        r.getJudgedBy()))
                .toList();
        suggestSupportProgramRepository.saveAll(rows);

        log.info("판정 저장 - businessId: {}, {}건", businessId, rows.size());
    }

    /**
     * AI 응답에 스키마 검증이 없어 LLM 이 엉뚱한 값을 뱉을 수 있다.
     * CHECK 제약에 걸려 222건 전체가 날아가는 것보다 unknown 으로 두는 편이 낫다.
     */
    private String normalizeStatus(RagResult result) {
        String status = result.getStatus();
        if (status != null && VALID_STATUS.contains(status)) {
            return status;
        }
        log.warn("알 수 없는 판정 상태 - programId: {}, status: {}", result.getProgramId(), status);
        return "unknown";
    }

    private String truncateReason(String reason) {
        if (reason == null || reason.length() <= REASON_MAX_LENGTH) {
            return reason;
        }
        log.warn("판정 사유가 {}자를 넘어 잘랐다", REASON_MAX_LENGTH);
        return reason.substring(0, REASON_MAX_LENGTH);
    }


    private void saveTaxes(BusinessInfo business, MydataSnapshot snapshot) {
        businessTaxRepository.deleteByBusinessId(business.getId());
        // DELETE 가 INSERT 보다 먼저 나가야 (business_id, period) 유니크 제약에 걸리지 않는다
        businessTaxRepository.flush();

        List<BusinessTax> rows = snapshot.getTaxes().stream()
                .map(t -> BusinessTax.of(business, t.getPeriod(), t.getRevenue(), t.getTax()))
                .toList();
        businessTaxRepository.saveAll(rows);

        log.info("매출 적재 - businessId: {}, {}개월", business.getId(), rows.size());
    }

    private void saveInsuranceChecklist(BusinessInfo business, MydataSnapshot snapshot) {
        // 이미 만들어진 체크리스트가 있으면 사용자가 손댔을 수 있으므로 건드리지 않는다
        if (!insuranceChecklistRepository.findAllByBusinessId(business.getId()).isEmpty()) {
            log.info("보험 체크리스트가 이미 있어 건너뛴다 - businessId: {}", business.getId());
            return;
        }

        Set<Long> joined = Set.copyOf(snapshot.getJoinedInsuranceIds());
        List<Insurance> targets =
                insuranceRepository.findAllForBusinessCode(snapshot.getBusinessCodeId());

        List<InsuranceChecklist> rows = targets.stream()
                .map(i -> InsuranceChecklist.of(
                        business,
                        i,
                        joined.contains(i.getId()) ? InsuranceStatus.COMPLETED : NOT_JOINED_STATUS))
                .toList();
        insuranceChecklistRepository.saveAll(rows);

        log.info("보험 체크리스트 생성 - businessId: {}, 대상 {}건 중 가입 {}건",
                business.getId(), rows.size(), joined.size());
    }

    /**
     * 체크리스트를 한 방향으로만 갱신한다.
     *
     * 마이데이터에 가입 기록이 있으면 COMPLETED 로 올리고, 없는 보험은 손대지 않는다.
     * 마이데이터 목이 실제 가입 현황을 전부 담고 있지 않아서, "없다"를 "해지했다"로
     * 읽으면 사용자가 직접 바꿔둔 값을 되돌리게 된다.
     */
    private void upgradeInsuranceChecklist(BusinessInfo business, MydataSnapshot snapshot) {

        Set<Long> joined = Set.copyOf(snapshot.getJoinedInsuranceIds());
        List<InsuranceChecklist> existing =
                insuranceChecklistRepository.findAllByBusinessId(business.getId());

        int upgraded = 0;
        for (InsuranceChecklist checklist : existing) {
            if (joined.contains(checklist.getInsurance().getId())
                    && checklist.getStatus() != InsuranceStatus.COMPLETED) {
                checklist.changeStatus(InsuranceStatus.COMPLETED);
                upgraded++;
            }
        }

        // 업종이 바뀌어 대상 보험이 늘었을 수 있다. 행이 없는 것만 새로 만든다.
        Set<Long> existingInsuranceIds = existing.stream()
                .map(c -> c.getInsurance().getId())
                .collect(Collectors.toSet());

        List<InsuranceChecklist> added =
                insuranceRepository.findAllForBusinessCode(snapshot.getBusinessCodeId()).stream()
                        .filter(i -> !existingInsuranceIds.contains(i.getId()))
                        .map(i -> InsuranceChecklist.of(
                                business,
                                i,
                                joined.contains(i.getId())
                                        ? InsuranceStatus.COMPLETED
                                        : NOT_JOINED_STATUS))
                        .toList();
        insuranceChecklistRepository.saveAll(added);

        log.info("보험 체크리스트 갱신 - businessId: {}, 상태 상향 {}건, 신규 {}건",
                business.getId(), upgraded, added.size());
    }

    private void saveAccounts(User user, List<SsafyDemandDepositAccountRecord> accounts) {
        if (accounts == null || accounts.isEmpty()) {
            log.info("금융망 계좌가 없다 - userId: {}", user.getId());
            return;
        }

        // account_no 가 유니크다. 이미 있는 계좌는 건너뛴다.
        List<Account> rows = accounts.stream()
                .filter(a -> !accountRepository.existsByAccountNo(a.getAccountNo()))
                .map(a -> Account.builder()
                        .user(user)
                        .bankName(a.getBankName())
                        .accountNo(a.getAccountNo())
                        .type(ACCOUNT_TYPE_COMMON)
                        .build())
                .toList();
        accountRepository.saveAll(rows);

        log.info("계좌 적재 - userId: {}, 신규 {}건 / 조회 {}건",
                user.getId(), rows.size(), accounts.size());
    }

    private void saveCreditRating(User user, String creditRatingName) {
        if (creditRatingName == null || creditRatingName.isBlank()) {
            return;
        }
        try {
            user.changeCreditRating(CreditRating.valueOf(creditRatingName.trim()));
        } catch (IllegalArgumentException e) {
            // 금융망이 A~E 밖의 값을 주면 비워둔다. 대출 자격 심사가 null 을 보고 판단한다.
            log.warn("알 수 없는 신용등급 - userId: {}, ratingName: {}", user.getId(), creditRatingName);
        }
    }

    /** 최근 12개월 매출 합. 자료가 없으면 null */
    private Long sumRecentTwelveMonths(List<MydataSnapshot.MonthlyTax> taxes) {
        if (taxes.isEmpty()) {
            return null;
        }
        LocalDate from = LocalDate.now().withDayOfMonth(1).minusMonths(12);
        return taxes.stream()
                .filter(t -> !t.getPeriod().isBefore(from))
                .mapToLong(MydataSnapshot.MonthlyTax::getRevenue)
                .sum();
    }
}