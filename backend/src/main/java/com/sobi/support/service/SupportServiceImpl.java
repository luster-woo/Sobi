package com.sobi.support.service;

import com.sobi.application.entity.Application;
import com.sobi.application.repository.ApplicationRepository;
import com.sobi.bookmark.repository.BookmarkRepository;
import com.sobi.business.entity.BusinessInfo;
import com.sobi.business.repository.BusinessReporitory;
import com.sobi.support.dto.*;
import com.sobi.support.entity.JudgementStatus;
import com.sobi.support.entity.SuggestSupportProgram;
import com.sobi.support.entity.SupportProgram;
import com.sobi.support.repository.SuggestSupportProgramRepository;
import com.sobi.support.repository.SupportProgramRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
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

    private final SupportProgramRepository supportProgramRepository;
    private final SuggestSupportProgramRepository suggestSupportProgramRepository;
    private final BookmarkRepository bookmarkRepository;
    private final ApplicationRepository applicationRepository;
    private final BusinessReporitory businessRepository;

    @Override
    @Transactional(readOnly = true)
    public SupportProgramListResponse getPrograms(Long userId, SupportSearchCondition condition) {

        // 예비창업자는 사업자 정보가 없다. 판정도 없으므로 전부 UNKNOWN 이 된다
        BusinessInfo business = businessRepository.findByUserId(userId);
        Long businessId = business == null ? null : business.getId();

        // 공고마다 조회하지 않도록 한 번에 가져온다
        Map<Long, JudgementStatus> judgements = findJudgements(businessId);
        Set<Long> bookmarkedIds = Set.copyOf(bookmarkRepository.findSupportProgramIdsByUserId(userId));
        Map<Long, String> latestApplications = findLatestApplications(userId);

        List<Row> rows = supportProgramRepository.findAllOpen(condition.getRegion()).stream()
                .map(program -> toRow(program, judgements, latestApplications, bookmarkedIds))
                .filter(row -> matches(row, condition))
                .sorted(comparator(condition.getSort()))
                .toList();

        int page = condition.getPage();
        int size = condition.getSize();
        int from = Math.min(page * size, rows.size());
        int to = Math.min(from + size, rows.size());

        List<SupportProgramSummaryResponse> programs = rows.subList(from, to).stream()
                .map(row -> SupportProgramSummaryResponse.of(row.program(), row.status(), row.bookmarked()))
                .toList();

        return SupportProgramListResponse.builder()
                .programs(programs)
                .page(PageMeta.of(page, size, rows.size()))
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

    private Row toRow(
            SupportProgram program,
            Map<Long, JudgementStatus> judgements,
            Map<Long, String> latestApplications,
            Set<Long> bookmarkedIds
    ) {
        JudgementStatus judgement = judgements.get(program.getId());

        return new Row(
                program,
                judgement,
                SupportStatus.of(judgement, latestApplications.get(program.getId())),
                bookmarkedIds.contains(program.getId())
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

    private Map<Long, JudgementStatus> findJudgements(Long businessId) {
        if (businessId == null) {
            return Map.of();
        }
        return suggestSupportProgramRepository.findAllByBusinessId(businessId).stream()
                .collect(Collectors.toMap(
                        suggest -> suggest.getId().getSupportProgramId(),
                        SuggestSupportProgram::getStatus,
                        (first, second) -> first));
    }

    private Map<Long, String> findLatestApplications(Long userId) {
        return applicationRepository.findAllSupportApplicationsByUserId(userId).stream()
                .collect(Collectors.toMap(
                        application -> application.getSupportProgram().getId(),
                        Application::getStatus,
                        (latest, older) -> latest));   // 최신순이라 먼저 온 것이 최근
    }
}