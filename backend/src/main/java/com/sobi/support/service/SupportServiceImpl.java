package com.sobi.support.service;

import com.sobi.application.entity.Application;
import com.sobi.application.repository.ApplicationRepository;
import com.sobi.bookmark.repository.BookmarkRepository;
import com.sobi.business.entity.BusinessInfo;
import com.sobi.business.repository.BusinessReporitory;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import com.sobi.global.external.ai.client.RagClient;
import com.sobi.global.external.ai.clientDto.RagExplainRequest;
import com.sobi.global.external.ai.clientDto.RagSearchTextRequest;
import com.sobi.global.external.ai.clientDto.RagSearchTextResponse;
import com.sobi.mydata.dto.MydataSnapshot;
import com.sobi.mydata.store.MydataStore;
import com.sobi.support.dto.*;
import com.sobi.support.entity.JudgementStatus;
import com.sobi.support.entity.SuggestSupportProgram;
import com.sobi.support.entity.SupportProgram;
import com.sobi.support.repository.SuggestSupportProgramRepository;
import com.sobi.support.repository.SupportProgramRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 지원사업 목록 조회.
 *
 * 판정이 사용자마다 달라 DB 에서 정렬·페이징할 수 없다. 접수 중인 공고 전체를
 * 가져와 메모리에서 처리한다. 공고가 222건이라 지금 규모에서는 문제가 없다.
 * 수천 건으로 늘면 판정을 조인해 DB 페이징으로 옮겨야 한다.
 */
@Service
@RequiredArgsConstructor
public class SupportServiceImpl implements SupportService {

    private static final String SORT_MAX_BALANCE_DESC = "maxBalance,desc";

    /** AI 에 요청할 상한. 임계값이 먼저 자르므로 실제로는 더 적게 온다 */
    private static final int SEARCH_TOP_K = 50;

    /** 검색은 SupportSearchCondition 을 거치지 않아 여기서 직접 막는다 */
    private static final int MAX_PAGE_SIZE = 100;

    private final SupportProgramRepository supportProgramRepository;
    private final SuggestSupportProgramRepository suggestSupportProgramRepository;
    private final BookmarkRepository bookmarkRepository;
    private final ApplicationRepository applicationRepository;
    private final BusinessReporitory businessRepository;
    private final RagClient ragClient;
    // 설명 생성에 넘길 프로필을 추천과 같은 경로로 얻는다
    private final MydataStore mydataStore;

    @Override
    @Transactional(readOnly = true)
    public SupportProgramListResponse getPrograms(Long userId, SupportSearchCondition condition) {

        // 목록은 전체를 훑어 정렬하므로 판정·신청도 전건이 필요하다
        UserContext context = loadContext(userId, null);

        List<Row> rows = supportProgramRepository.findAllOpen(condition.getRegion()).stream()
                .map(program -> toRow(program, context))
                .filter(row -> matches(row, condition))
                .sorted(comparator(condition.getSort()))
                .toList();

        int page = condition.getPage();
        int size = condition.getSize();

        List<SupportProgramSummaryResponse> programs = slice(rows, page, size).stream()
                .map(row -> SupportProgramSummaryResponse.of(row.program(), row.status(), row.bookmarked()))
                .toList();

        return SupportProgramListResponse.builder()
                .programs(programs)
                .page(PageMeta.of(page, size, rows.size()))
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public SupportProgramDetailResponse getProgram(Long userId, Long supportProgramId) {

        SupportProgram program = supportProgramRepository.findById(supportProgramId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SUPPORT_PROGRAM_NOT_FOUND));

        // 예비창업자는 사업자 정보가 없어 판정도 없다. status 는 UNKNOWN 이 된다
        BusinessInfo business = businessRepository.findByUserId(userId);

        SuggestSupportProgram judgement = business == null
                ? null
                : suggestSupportProgramRepository
                .findByBusinessIdAndSupportProgram_Id(business.getId(), supportProgramId);

        Application latestApplication = applicationRepository
                .findFirstByUser_IdAndSupportProgram_IdOrderByIdDesc(userId, supportProgramId)
                .orElse(null);

        SupportStatus status = SupportStatus.of(
                judgement == null ? null : judgement.getStatus(),
                latestApplication == null ? null : latestApplication.getStatus()
        );

        return SupportProgramDetailResponse.of(
                program,
                judgement,
                status,
                // 진행 중인 신청이 있을 때만 [이어서 작성] 으로 이동할 id 를 내려준다
                status.isFromApplication() ? latestApplication.getId() : null,
                bookmarkRepository.existsByUser_IdAndSupportProgram_Id(userId, supportProgramId)
        );
    }

    /**
     * 판정 사유 설명. 없으면 AI 에 만들게 하고 저장한다.
     *
     * <p><b>readOnly 가 아니다.</b> 생성한 설명을 판정 행에 붙여야 하기 때문이다.
     * 더티 체킹으로 커밋 시점에 UPDATE 가 나간다.
     *
     * <p>순서에 이유가 있다. 판정 행을 먼저 찾고, 없으면 거기서 끝낸다.
     * 예비창업자와 연동 전 사용자는 판정 자체가 없어 설명할 대상이 없고,
     * 행이 있다는 것은 연동을 마쳤다는 뜻이라 그때만 프로필을 읽으면 된다.
     *
     * <p>프로필은 {@code MydataStore.read()} 를 그대로 쓴다. 추천이 쓴 것과
     * 같은 경로여야 AI 가 판정 때와 같은 근거 청크를 고른다. 가벼운 조회를
     * 따로 만들면 매출 합산 같은 계산이 갈라져 조용히 틀리게 된다.
     */
    @Override
    @Transactional
    public String getExplanation(Long userId, Long supportProgramId) {

        BusinessInfo business = businessRepository.findByUserId(userId);
        if (business == null) {
            return null;
        }

        SuggestSupportProgram judgement = suggestSupportProgramRepository
                .findByBusinessIdAndSupportProgram_Id(business.getId(), supportProgramId);
        if (judgement == null) {
            return null;
        }
        if (judgement.getExplanation() != null) {
            return judgement.getExplanation();
        }

        MydataSnapshot snapshot = mydataStore.read(userId);
        String explanation = ragClient.explain(RagExplainRequest.builder()
                .programId(supportProgramId)
                // enum 이름이 아니라 dbValue 를 쓴다. AI 계약이 소문자다
                .status(judgement.getStatus().getDbValue())
                .region(snapshot.getRegion())
                .address(snapshot.getAddress())
                .businessCode(snapshot.getBusinessCode())
                .employeeCount(snapshot.getEmployeeCount())
                .openDate(snapshot.getOpenDate())
                .annualRevenue(snapshot.getAnnualRevenue())
                .birthDate(snapshot.getBirthDate())
                .build());

        // 실패하면 저장하지 않는다. 다음 조회에서 다시 시도한다.
        if (explanation != null) {
            judgement.applyExplanation(explanation);
        }
        return explanation;
    }

    /**
     * 자연어 검색.
     *
     * AI 는 공고 id 와 유사도만 준다. 판정은 마이데이터 연동 때 저장해둔 값을 붙인다.
     * LLM 을 다시 부르지 않으므로 1초 안쪽이다.
     *
     * 목록과 달리 판정 순으로 재정렬하지 않는다. 검색은 "질의와 가까운 것" 을
     * 원하는 요청이라, 순서를 바꾸면 검색 의도가 깨진다.
     *
     * @Transactional 을 붙이지 않는다. AI 호출이 트랜잭션 안에 들어가면
     * 그동안 DB 커넥션을 붙든다. 클라이언트 타임아웃이 120초다.
     */
    @Override
    public SupportProgramListResponse searchPrograms(Long userId, String query, int page, int size) {

        int safePage = safePage(page);
        int safeSize = safeSize(size);

        List<RagSearchTextResponse.Hit> hits = ragClient.searchText(
                RagSearchTextRequest.builder()
                        .query(query)
                        .topK(SEARCH_TOP_K)
                        .build()
        ).getPrograms();

        if (hits.isEmpty()) {
            return SupportProgramListResponse.builder()
                    .programs(List.of())
                    .page(PageMeta.of(safePage, safeSize, 0))
                    .build();
        }

        List<Long> orderedIds = hits.stream()
                .map(RagSearchTextResponse.Hit::getProgramId)
                .toList();

        Map<Long, SupportProgram> programs =
                supportProgramRepository.findAllOpenByIds(orderedIds).stream()
                        .collect(Collectors.toMap(SupportProgram::getId, Function.identity()));

        // 검색은 보통 한 자릿수 결과다. 판정·신청을 전건 읽을 이유가 없다
        UserContext context = loadContext(userId, orderedIds);

        // AI 가 준 유사도 순서를 그대로 유지한다
        List<SupportProgramSummaryResponse> ordered = orderedIds.stream()
                .map(programs::get)
                .filter(Objects::nonNull)   // 마감돼 조회에서 빠진 공고
                .map(program -> SupportProgramSummaryResponse.of(
                        program,
                        SupportStatus.of(
                                context.judgements().get(program.getId()),
                                context.latestApplications().get(program.getId())),
                        context.bookmarkedIds().contains(program.getId())))
                .toList();

        return SupportProgramListResponse.builder()
                .programs(slice(ordered, safePage, safeSize))
                .page(PageMeta.of(safePage, safeSize, ordered.size()))
                .build();
    }

    /**
     * 정렬과 필터에 판정(judgement)과 뱃지(status)가 둘 다 필요하다.
     * 뱃지는 신청 상태가 섞인 값이라 정렬 기준으로 쓸 수 없다.
     */
    private record Row(
            SupportProgram program,
            JudgementStatus judgement,
            SupportStatus status,
            boolean bookmarked
    ) {
    }

    private Row toRow(SupportProgram program, UserContext context) {

        JudgementStatus judgement = context.judgements().get(program.getId());

        return new Row(
                program,
                judgement,
                SupportStatus.of(judgement, context.latestApplications().get(program.getId())),
                context.bookmarkedIds().contains(program.getId())
        );
    }

    private boolean matches(Row row, SupportSearchCondition condition) {

        if (condition.getType() != null
                && SupportProgramType.from(row.program().getType()) != condition.getType()) {
            return false;
        }

        // 판정 기준으로 거른다. 이미 신청한 공고도 판정이 맞으면 잡힌다
        if (condition.getJudgement() != null
                && SupportStatus.of(row.judgement(), null) != condition.getJudgement()) {
            return false;
        }

        return !condition.onlyBookmarked() || row.bookmarked();
    }

    /** 판정 순이 항상 1차. 자격이 안 되는 공고가 목록 위를 채우지 않게 한다 */
    private Comparator<Row> comparator(String sort) {
        Comparator<Row> byJudgement = Comparator.comparingInt(row -> judgementOrder(row.judgement()));
        return byJudgement.thenComparing(secondaryComparator(sort));
    }

    private int judgementOrder(JudgementStatus judgement) {
        if (judgement == null) {
            return 1;   // 마이데이터 미연동. UNKNOWN 과 같은 자리
        }
        return switch (judgement) {
            case ELIGIBLE -> 0;
            case UNKNOWN -> 1;
            case INELIGIBLE -> 2;
        };
    }

    private Comparator<Row> secondaryComparator(String sort) {

        if (SORT_MAX_BALANCE_DESC.equals(sort)) {
            // 금액이 없는 ETC 는 맨 뒤
            return Comparator.comparing(
                    (Row row) -> row.program().getMaxBalance(),
                    Comparator.nullsLast(Comparator.reverseOrder()));
        }

        // 기본은 마감 임박순. 마감일이 없는 상시 공고는 맨 뒤
        return Comparator.comparing(
                (Row row) -> row.program().getEndDate(),
                Comparator.nullsLast(Comparator.naturalOrder()));
    }

    /**
     * 뱃지를 만드는 데 필요한 사용자별 값 묶음.
     * 공고마다 조회하면 쿼리가 공고 수만큼 나가므로 한 번에 읽어 맵으로 접는다.
     */
    private record UserContext(
            Map<Long, JudgementStatus> judgements,
            Map<Long, String> latestApplications,
            Set<Long> bookmarkedIds
    ) {
    }

    /**
     * @param programIds 대상 공고. null 이면 전건을 읽는다.
     *                   목록은 전체를 정렬해야 해서 전건, 검색은 결과가 한 자릿수라 좁힌다.
     */
    private UserContext loadContext(Long userId, List<Long> programIds) {

        // 예비창업자는 사업자 정보가 없다. 판정도 없으므로 전부 UNKNOWN 이 된다
        BusinessInfo business = businessRepository.findByUserId(userId);
        Long businessId = business == null ? null : business.getId();

        return new UserContext(
                findJudgements(businessId, programIds),
                findLatestApplications(userId, programIds),
                Set.copyOf(bookmarkRepository.findSupportProgramIdsByUserId(userId))
        );
    }

    private Map<Long, JudgementStatus> findJudgements(Long businessId, List<Long> programIds) {

        if (businessId == null) {
            return Map.of();
        }

        List<SuggestSupportProgram> found = programIds == null
                ? suggestSupportProgramRepository.findAllByBusinessId(businessId)
                : suggestSupportProgramRepository.findAllByBusinessIdAndProgramIds(businessId, programIds);

        return found.stream()
                .collect(Collectors.toMap(
                        suggest -> suggest.getId().getSupportProgramId(),
                        SuggestSupportProgram::getStatus,
                        (first, second) -> first));
    }

    private Map<Long, String> findLatestApplications(Long userId, List<Long> programIds) {

        List<Application> found = programIds == null
                ? applicationRepository.findAllSupportApplicationsByUserId(userId)
                : applicationRepository.findSupportApplicationsByUserIdAndProgramIds(userId, programIds);

        return found.stream()
                .collect(Collectors.toMap(
                        application -> application.getSupportProgram().getId(),
                        Application::getStatus,
                        (latest, older) -> latest));   // 최신순이라 먼저 온 것이 최근
    }

    /**
     * 요청한 페이지 구간을 잘라 낸다.
     *
     * page * size 를 int 로 계산하면 큰 page 에서 오버플로가 나 음수 인덱스가 된다.
     * long 으로 계산한 뒤 목록 크기로 막는다.
     */
    private <T> List<T> slice(List<T> items, int page, int size) {

        int from = (int) Math.min((long) page * size, items.size());
        int to = (int) Math.min((long) from + size, items.size());

        return items.subList(from, to);
    }

    private int safePage(int page) {
        return Math.max(page, 0);
    }

    private int safeSize(int size) {
        return Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
    }
}