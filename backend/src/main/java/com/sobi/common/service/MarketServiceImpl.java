package com.sobi.common.service;

import com.sobi.common.dto.DongItem;
import com.sobi.common.dto.MarketAnalysisResponse;
import com.sobi.common.dto.MarketAnalysisResponse.Business;
import com.sobi.common.dto.MarketAnalysisResponse.BusinessMix;
import com.sobi.common.dto.MarketAnalysisResponse.BusinessMixItem;
import com.sobi.common.dto.MarketAnalysisResponse.ByDayType;
import com.sobi.common.dto.MarketAnalysisResponse.ByGender;
import com.sobi.common.dto.MarketAnalysisResponse.Density;
import com.sobi.common.dto.MarketAnalysisResponse.GenderRatio;
import com.sobi.common.dto.MarketAnalysisResponse.Location;
import com.sobi.common.dto.MarketAnalysisResponse.Meta;
import com.sobi.common.dto.MarketAnalysisResponse.Neighbor;
import com.sobi.common.dto.MarketAnalysisResponse.RevenuePerStoreBenchmark;
import com.sobi.common.dto.MarketAnalysisResponse.RevenueStructure;
import com.sobi.common.dto.MarketAnalysisResponse.SeoulRank;
import com.sobi.common.dto.MarketAnalysisResponse.StoreChurn;
import com.sobi.common.dto.MarketAnalysisResponse.StoreCountBenchmark;
import com.sobi.common.dto.MarketAnalysisResponse.Summary;
import com.sobi.common.dto.MarketBusinessResponse;
import com.sobi.common.dto.MarketBusinessResponse.Major;
import com.sobi.common.dto.MarketBusinessResponse.Minor;
import com.sobi.common.dto.MarketBusinessResponse.Sub;
import com.sobi.common.dto.MarketRegionResponse;
import com.sobi.common.dto.MarketRegionResponse.District;
import com.sobi.common.dto.MarketRegionResponse.Dong;
import com.sobi.common.entity.MajorCode;
import com.sobi.common.entity.MinorCode;
import com.sobi.common.entity.SeoulCommercialData;
import com.sobi.common.entity.SubCode;
import com.sobi.common.repository.MinorCodeRepository;
import com.sobi.common.repository.SeoulCommercialDataRepository;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MarketServiceImpl implements MarketService {

    // 데이터는 20262분기 기준
    private static final String DATA_QUARTER = "202602";

    // 분기당 월 3, 일 90으로 계산
    private static final int MONTHLY_DIVISOR = 3;
    private static final int DAILY_DIVISOR = 90;

    private static final String CITY_NAME = "서울특별시";

    // 주변 상권 비교 행 수 
    private static final int DEFAULT_COMPARE_LIMIT = 7;
    // 업종 구성 항목 수
    private static final int DEFAULT_MIX_LIMIT = 6;
    private static final int MAX_LIMIT = 20;

    // 코드 형식 검산 8자리, CS+6자리
    private static final Pattern DONG_CODE_PATTERN = Pattern.compile("^\\d{8}$");
    private static final Pattern BUSINESS_CODE_PATTERN = Pattern.compile("^CS\\d{6}$");

    private final SeoulCommercialDataRepository seoulCommercialDataRepository;
    private final MinorCodeRepository minorCodeRepository;

    @Override
    public MarketAnalysisResponse getMarketAnalysis(
            String dongCode,
            String businessCode,
            Integer compareLimit,
            Integer mixLimit
    ) {
        validateCode(dongCode, DONG_CODE_PATTERN);
        validateCode(businessCode, BUSINESS_CODE_PATTERN);

        int neighborLimit = resolveLimit(compareLimit, DEFAULT_COMPARE_LIMIT);
        int mixItemLimit = resolveLimit(mixLimit, DEFAULT_MIX_LIMIT);

        SeoulCommercialData target = seoulCommercialDataRepository
                .findByDongCodeAndBusinessCode(dongCode, businessCode)
                .orElseThrow(() -> notFoundReason(dongCode, businessCode));

        // 같은 업종의 서울 전체 행 — 벤치마크·순위·서울 평균 폐업률의 모집단
        List<SeoulCommercialData> seoulRows =
                seoulCommercialDataRepository.findByBusinessCode(businessCode);

        // 같은 자치구 내 동종업종 — 주변 상권 비교표와 자치구 평균
        List<SeoulCommercialData> districtRows = seoulCommercialDataRepository
                .findByDistrictCodeAndBusinessCodeOrderByTotalCountDesc(
                        target.getDistrictCode(),
                        businessCode
                );

        // 해당 동의 전체 업종 — 업종 구성
        List<SeoulCommercialData> dongRows =
                seoulCommercialDataRepository.findByDongCodeOrderByTotalCountDesc(dongCode);

        double seoulAvgStoreCount = averageStoreCount(seoulRows);
        double districtAvgStoreCount = averageStoreCount(districtRows);

        // 점포당 월 매출의 서울 분포. 매출이 결측인 업종은 비어 있다.
        List<Long> seoulRevenuePerStore = seoulRows.stream()
                .map(MarketServiceImpl::revenuePerStoreMonthly)
                .filter(Objects::nonNull)
                .sorted()
                .toList();

        return new MarketAnalysisResponse(
                new Meta(DATA_QUARTER, MONTHLY_DIVISOR, DAILY_DIVISOR),
                new Location(
                        CITY_NAME,
                        target.getDistrictCode(),
                        target.getDistrictName(),
                        target.getDongCode(),
                        target.getDongName()
                ),
                new Business(target.getBusinessCode(), target.getBusinessName()),
                toSummary(target, seoulAvgStoreCount, districtAvgStoreCount, seoulRevenuePerStore),
                new Density(
                        Math.round(seoulAvgStoreCount),
                        Math.round(districtAvgStoreCount),
                        target.getTotalCount()
                ),
                toNeighbors(districtRows, neighborLimit),
                toRevenueStructure(target),
                toBusinessMix(dongRows, mixItemLimit),
                toSeoulRank(target, seoulRevenuePerStore),
                toStoreChurn(target, seoulRows)
        );
    }

    @Override
    public MarketRegionResponse getRegions() {
        Map<String, District> districts = new LinkedHashMap<>();

        for (DongItem dong : seoulCommercialDataRepository.findAllDongs()) {
            District district = districts.computeIfAbsent(
                    dong.districtCode(),
                    code -> new District(code, dong.districtName(), new ArrayList<>())
            );
            district.dongs().add(new Dong(dong.dongCode(), dong.dongName()));
        }

        // 자치구는 이름순, 동은 쿼리의 코드순을 유지한다.
        // DB collation(en_US.utf8)은 한글을 가나다순으로 정렬하지 못해서 Java에서 정렬한다.
        List<District> sorted = districts.values().stream()
                .sorted(Comparator.comparing(District::name))
                .toList();

        return new MarketRegionResponse(CITY_NAME, sorted);
    }

    @Override
    public MarketBusinessResponse getBusinesses() {
        Map<String, Major> majors = new LinkedHashMap<>();
        Map<String, Sub> subs = new LinkedHashMap<>();

        // 소분류 100행을 읽으면서 대 - 중 - 소 트리를 조립
        for (MinorCode minor : minorCodeRepository.findAllWithHierarchy()) {
            SubCode subCode = minor.getSubCode();
            MajorCode majorCode = subCode.getMajorCode();

            Major major = majors.computeIfAbsent(
                    majorCode.getCode(),
                    code -> new Major(code, majorCode.getName(), new ArrayList<>())
            );
            Sub sub = subs.computeIfAbsent(
                    subCode.getCode(),
                    code -> {
                        Sub created = new Sub(code, subCode.getName(), new ArrayList<>());
                        major.subs().add(created);
                        return created;
                    }
            );

            sub.minors().add(new Minor(minor.getCode(), minor.getName()));
        }

        return new MarketBusinessResponse(List.copyOf(majors.values()));
    }

    // ---------------------------------------------------------------- 블록 조립

    private Summary toSummary(
            SeoulCommercialData target,
            double seoulAvgStoreCount,
            double districtAvgStoreCount,
            List<Long> seoulRevenuePerStore
    ) {
        long dailyFootTraffic = dailyFootTraffic(target);
        Long revenuePerStoreMonthly = revenuePerStoreMonthly(target);

        return new Summary(
                target.getTotalCount(),
                new StoreCountBenchmark(
                        round1(seoulAvgStoreCount),
                        round1(districtAvgStoreCount)
                ),
                dailyFootTraffic,
                footTrafficPerStoreDaily(target),
                new GenderRatio(
                        ratio(target.getMalePopulation(), target.getTotalPopulation()),
                        ratio(target.getFemalePopulation(), target.getTotalPopulation())
                ),
                revenuePerStoreMonthly,
                toRevenuePerStoreBenchmark(revenuePerStoreMonthly, seoulRevenuePerStore)
        );
    }

    /**
     * 비교 대상인 자기 매출이 없으면 프론트가 카드 자체를 숨기므로 벤치마크도 함께 null 이다.
     * 매출 관련 값은 0 이 아니라 null 이어야 "매출 0원인 상권"으로 그려지지 않는다.
     */
    private RevenuePerStoreBenchmark toRevenuePerStoreBenchmark(
            Long revenuePerStoreMonthly,
            List<Long> sortedValues
    ) {
        if (revenuePerStoreMonthly == null || sortedValues.isEmpty()) {
            return null;
        }

        double average = sortedValues.stream()
                .mapToLong(Long::longValue)
                .average()
                .orElse(0);

        return new RevenuePerStoreBenchmark(
                Math.round(average),
                Math.round(percentile(sortedValues, 0.5)),
                Math.round(percentile(sortedValues, 0.75))
        );
    }

    private List<Neighbor> toNeighbors(List<SeoulCommercialData> districtRows, int limit) {
        return districtRows.stream()
                .limit(limit)
                .map(row -> new Neighbor(
                        row.getDongCode(),
                        row.getDongName(),
                        row.getTotalCount(),
                        dailyFootTraffic(row),
                        footTrafficPerStoreDaily(row),
                        revenuePerStoreMonthly(row),
                        ratio(row.getCloseCount(), row.getTotalCount())
                ))
                .toList();
    }

    /**
     * 매출 구조. 비율은 분기/월 환산과 무관하고 금액만 월 환산된 값이다.
     * 매출 자체가 결측이면 블록 전체가 null 이다.
     */
    private RevenueStructure toRevenueStructure(SeoulCommercialData target) {
        Long monthRevenue = target.getMonthRevenue();

        if (monthRevenue == null) {
            return null;
        }

        long weekday = zeroIfNull(target.getWeekRevenue());
        long weekend = zeroIfNull(target.getWeekendRevenue());
        long dayTotal = weekday + weekend;

        ByDayType byDayType = new ByDayType(
                ratio(weekday, dayTotal),
                ratio(weekend, dayTotal),
                toMonthly(weekday),
                toMonthly(weekend)
        );

        ByGender byGender = null;

        if (target.getMaleRevenue() != null || target.getFemaleRevenue() != null) {
            long male = zeroIfNull(target.getMaleRevenue());
            long female = zeroIfNull(target.getFemaleRevenue());
            long genderTotal = male + female;

            byGender = new ByGender(
                    ratio(male, genderTotal),
                    ratio(female, genderTotal),
                    toMonthly(male),
                    toMonthly(female),
                    ratio(genderTotal, monthRevenue)
            );
        }

        return new RevenueStructure(byDayType, byGender);
    }

    private BusinessMix toBusinessMix(List<SeoulCommercialData> dongRows, int limit) {
        long totalStoreCount = dongRows.stream()
                .mapToLong(SeoulCommercialData::getTotalCount)
                .sum();

        List<BusinessMixItem> items = dongRows.stream()
                .limit(limit)
                .map(row -> new BusinessMixItem(
                        row.getBusinessCode(),
                        row.getBusinessName(),
                        row.getTotalCount(),
                        ratio(row.getTotalCount(), totalStoreCount)
                ))
                .toList();

        return new BusinessMix(totalStoreCount, items);
    }

    /**
     * 점포당 월 매출 기준 서울 순위. 
     * 모집단은 해당 업종의 매출 데이터가 있는 동 -> 매출이 결측인 업종은 순위 자체가 성립하지 않아 null
     */
    private SeoulRank toSeoulRank(SeoulCommercialData target, List<Long> sortedValues) {
        Long myRevenue = revenuePerStoreMonthly(target);

        if (myRevenue == null || sortedValues.isEmpty()) {
            return null;
        }

        long below = sortedValues.stream()
                .filter(value -> value < myRevenue)
                .count();

        int percentile = (int) Math.round(below * 100.0 / sortedValues.size());

        return new SeoulRank(
                percentile,
                100 - percentile,
                Math.round(percentile(sortedValues, 0.5))
        );
    }

    /** 개·폐업은 최근 4분기 누계 - 연간 기준 */
    private StoreChurn toStoreChurn(SeoulCommercialData target, List<SeoulCommercialData> seoulRows) {
        long seoulCloseCount = seoulRows.stream()
                .mapToLong(SeoulCommercialData::getCloseCount)
                .sum();
        long seoulStoreCount = seoulRows.stream()
                .mapToLong(SeoulCommercialData::getTotalCount)
                .sum();

        return new StoreChurn(
                target.getOpenCount(),
                target.getCloseCount(),
                target.getOpenCount() - target.getCloseCount(),
                ratio(target.getCloseCount(), target.getTotalCount()),
                ratio(target.getOpenCount(), target.getTotalCount()),
                ratio(seoulCloseCount, seoulStoreCount)
        );
    }

    // ---------------------------------------------------------------- 환산·계산

    private static long dailyFootTraffic(SeoulCommercialData row) {
        return Math.round(row.getTotalPopulation() / (double) DAILY_DIVISOR);
    }

    private static Long footTrafficPerStoreDaily(SeoulCommercialData row) {
        if (row.getTotalCount() == null || row.getTotalCount() == 0) {
            return null;
        }

        return Math.round(dailyFootTraffic(row) / (double) row.getTotalCount());
    }

    private static Long revenuePerStoreMonthly(SeoulCommercialData row) {
        if (row.getMonthRevenue() == null || row.getTotalCount() == null || row.getTotalCount() == 0) {
            return null;
        }

        return Math.round(row.getMonthRevenue() / (double) MONTHLY_DIVISOR / row.getTotalCount());
    }

    private static long toMonthly(long quarterValue) {
        return Math.round(quarterValue / (double) MONTHLY_DIVISOR);
    }

    private static double averageStoreCount(List<SeoulCommercialData> rows) {
        return rows.stream()
                .mapToLong(SeoulCommercialData::getTotalCount)
                .average()
                .orElse(0);
    }

    /** 0~100 백분율. 분모가 0이면 비율이 성립하지 않으므로 null */
    private static Double ratio(long part, long total) {
        if (total == 0) {
            return null;
        }

        return round1(part * 100.0 / total);
    }

    /** 정렬된 값에서의 백분위. 이웃한 두 값을 선형 보간한다. */
    private static double percentile(List<Long> sortedValues, double fraction) {
        if (sortedValues.size() == 1) {
            return sortedValues.get(0);
        }

        double position = fraction * (sortedValues.size() - 1);
        int lower = (int) Math.floor(position);
        int upper = (int) Math.ceil(position);

        if (lower == upper) {
            return sortedValues.get(lower);
        }

        return sortedValues.get(lower) + (sortedValues.get(upper) - sortedValues.get(lower)) * (position - lower);
    }

    private static Double round1(double value) {
        return Math.round(value * 10) / 10.0;
    }

    private static long zeroIfNull(Long value) {
        return value == null ? 0L : value;
    }

    // ---------------------------------------------------------------- 검증

    // 입력 코드 검증
    private static void validateCode(String code, Pattern pattern) {
        if (code == null || !pattern.matcher(code).matches()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
        }
    }

    // 입력 범위 검증
    private static int resolveLimit(Integer requested, int defaultValue) {
        if (requested == null) {
            return defaultValue;
        }

        if (requested < 1 || requested > MAX_LIMIT) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
        }

        return requested;
    }

    /**
     * 행이 없는 이유를 구분
     * 코드 자체가 없는 것(MARKET_001/002)과
     * 코드는 유효하지만 동·업종 조합의 행이 없는 것(MARKET_003)
     */
    private BusinessException notFoundReason(String dongCode, String businessCode) {
        if (!seoulCommercialDataRepository.existsByDongCode(dongCode)) {
            return new BusinessException(ErrorCode.DONG_NOT_FOUND);
        }

        if (!seoulCommercialDataRepository.existsByBusinessCode(businessCode)) {
            return new BusinessException(ErrorCode.MARKET_BUSINESS_NOT_FOUND);
        }

        return new BusinessException(ErrorCode.MARKET_DATA_NOT_FOUND);
    }
}
