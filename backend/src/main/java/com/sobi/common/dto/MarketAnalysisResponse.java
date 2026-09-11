package com.sobi.common.dto;

import java.util.List;

/**
 * 상권 분석 화면 하나를 채우는 응답
 *
 * 금액, 인구는 모두 서버에서 계산을 끝낸 값이며 필드명에 기간이 들어 있다
 * (`...Monthly`, `daily...`, `annual...`). 비율은 0~100 백분율
 *
 * 매출이 집계되지 않는 업종은 조회 자체는 성공이므로 매출 관련 블록만 null 로 내려간다
 */
public record MarketAnalysisResponse(
        Meta meta,                          // 검증용 집계 기준 분기와 환산 계수
        Location location,                  // 조회한 지역 (시/구/동) 
        Business business,                  // 조회한 업종
        Summary summary,                    // 화면 상단 핵심지표 3칸
        Density density,                    // 동종업종 밀집도
        List<Neighbor> neighbors,           // 주변 상권 비교표
        RevenueStructure revenueStructure,  // 매출 구조 (매출 미집계 업종이면 null)
        BusinessMix businessMix,            // 이 동의 업종 구성
        SeoulRank seoulRank,                // 서울 내 매출 순위 (매출 미집계 업종이면 null)
        StoreChurn storeChurn               // 개업/폐업 현황
) {

    /** 집계 기준 분기와 환산 계수 */
    public record Meta(
            String dataQuarter,   // 집계 기준 분기 (ex. "202602")
            int monthlyDivisor,   // 분기 합계를 월로 나눈 계수(3). 
            int dailyDivisor      // 분기 합계를 일로 나눈 계수(90)
    ) {
    }

    public record Location(
            String cityName,      // "서울특별시" 고정
            String districtCode,  // 자치구 코드 5자리
            String districtName,  // 자치구 이름 
            String dongCode,      // 행정동 코드 8자리
            String dongName       // 행정동 이름 
    ) {
    }

    public record Business(
            String code,  // 업종 코드 (ex. "CS100001")
            String name   // 업종 이름 (ex. "한식음식점")
    ) {
    }

    /** 핵심지표 3개 + 매출 구조 카드가 쓰는 유동인구 성비(성비는 null값이 없기 때문에 summary에 넣음) */
    public record Summary(
            Long storeCount,                                   // [지표1] 이 동의 해당 업종 점포 수
            StoreCountBenchmark storeCountBenchmark,           // [지표1] 위 점포 수와 비교할 평균값
            Long dailyFootTraffic,                             // [지표2] 이 동의 일평균 유동인구
            Long footTrafficPerStoreDaily,                     // [지표2] 점포 하나가 하루에 마주하는 유동인구 = dailyFootTraffic / storeCount
            GenderRatio footTrafficGender,                     // 유동인구 성비
            Long revenuePerStoreMonthly,                       // [지표3] 점포당 월 매출. 매출 미집계 업종이면 null
            RevenuePerStoreBenchmark revenuePerStoreBenchmark  // [지표3] 비교할 서울 분포. 위 값이 null이면 함께 null
    ) {
    }

    public record StoreCountBenchmark(
            Double seoulAvg,     // 서울 전체 동의 동종업종 평균 점포 수
            Double districtAvg   // 같은 자치구 동들의 동종업종 평균 점포 수
    ) {
    }

    public record GenderRatio(
            Double maleRatio,    // 남성 비율 (0~100)
            Double femaleRatio   // 여성 비율. 
    ) {
    }

    public record RevenuePerStoreBenchmark(
            Long seoulAvg,     // 서울 평균 점포당 월 매출 (매출이 집계된 동만)
            Long seoulMedian,  // 서울 중위값. 평균은 상위 몇 곳에 끌려가므로 중위값을 함께 본다
            Long seoulTop25    // 상위 25% 진입선 (75번째 백분위)
    ) {
    }

    /** 동종업종 밀집도 */
    public record Density(
            Long seoulAvg,     // 서울 평균 점포 수 (StoreCountBenchmark.seoulAvg를 반올림한 값)
            Long districtAvg,  // 자치구 평균 점포 수
            Long dong          // 이 동의 점포 수 (summary.storeCount와 같은 값)
    ) {
    }

    /** 같은 자치구 내 동종업종. 현재 조회 중인 동도 포함 */
    public record Neighbor(
            String dongCode,                
            String dongName,
            Long storeCount,                // 내림차순으로 정렬
            Long dailyFootTraffic,          // 그 동의 일평균 유동인구
            Long footTrafficPerStoreDaily,  // 그 동의 점포당 일평균 유동인구
            Long revenuePerStoreMonthly,    // 그 동만 매출이 없을 수 있어 행마다 개별적으로 null이 될 수 있다
            Double annualCloseRate          // 그 동의 연간 폐업률
    ) {
    }

    /** 매출 구조 - 요일&성별 */
    public record RevenueStructure(
            ByDayType byDayType,  // 주중/주말 구성
            ByGender byGender     // 남성/여성 구성
    ) {
    }

    public record ByDayType(
            Double weekdayRatio,          // 주중 매출 비중. 
            Double weekendRatio,          // 주말 매출 비중. weekdayRatio와 합쳐 100
            Long weekdayRevenueMonthly,   // 주중 월 매출액. 점포당이 아니라 이 동·업종 전체 합계
            Long weekendRevenueMonthly    // 주말 월 매출액
    ) {
    }

    /**
     * coverageRatio 는 남녀 매출 합이 전체 매출의 몇 %인지다.
     * 원본에 이 합이 100%에 못 미치는 행이 있어 정규화 여부 판단에 쓴다.
     */
    public record ByGender(
            Double maleRatio,            // 남성 매출 비중
            Double femaleRatio,          // 여성 매출 비중
            Long maleRevenueMonthly,     // 남성 월 매출액 (동·업종 전체 합계)
            Long femaleRevenueMonthly,   // 여성 월 매출액
            Double coverageRatio         // 남녀 매출 합이 전체 매출의 몇 %인지. (검증용)
    ) {
    }

    /** 동 전체 점포 기준 상위 업종. */
    public record BusinessMix(
            Long totalStoreCount,          // 이 동의 전체 업종 점포 수 합계. sharePercent의 분모
            List<BusinessMixItem> items    // 점포 수 상위 업종 (기본 6개)
    ) {
    }

    public record BusinessMixItem(
            String code,           
            String name,
            Long storeCount,       // 이 동의 해당 업종 점포 수
            Double sharePercent    // 동 전체 점포 중 차지하는 비중 = storeCount / totalStoreCount
    ) {
    }

    /**
     * 점포당 월 매출 기준 순위. 모집단은 해당 업종의 매출 데이터가 있는 동
     * ex) percentile 74 는 아래에서 74% 지점, 즉 상위 26%(topPercent)라는 뜻
     */
    public record SeoulRank(
            Integer percentile,   // 아래에서 몇 % 지점인지 (0~100)
            Integer topPercent,   // 100 - percentile
            Long seoulMedian      // 서울 중위 점포당 월 매출
    ) {
    }

    /** opened/closed 는 최근 4분기 누계. net 이 음수면 순감소 상권. */
    public record StoreChurn(
            Long opened,                 // 최근 4분기 개업 점포 수
            Long closed,                 // 최근 4분기 폐업 점포 수
            Long net,                    // opened - closed. 음수면 점포가 줄고 있는 상권
            Double annualCloseRate,      // 연간 폐업률 = closed / storeCount
            Double annualOpenRate,       // 연간 개업률 = opened / storeCount
            Double seoulAvgCloseRate     // 같은 업종 서울 전체의 평균 폐업률. 위 폐업률을 판단할 기준선
    ) {
    }
}
