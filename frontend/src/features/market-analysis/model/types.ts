/**
 * 상권 분석 응답 (S15P21D101-182).
 *
 * 명세의 응답 구조를 그대로 옮겼다. 블록별로 타입을 나눈 이유는 각 패널이 자기 블록만
 * props 로 받게 하려는 것이다 — 한 덩어리로 두면 패널마다 MarketAnalysis 전체를 받아
 * 안에서 파고들고, 응답이 바뀔 때 패널 전부가 같이 흔들린다.
 *
 * ⚠️ null 이 오는 경우가 두 갈래다.
 *
 *    1) 매출 미집계 업종 — 원본에서 매출 컬럼이 빈 행이 53% 다. 조회는 200 으로
 *       성공하고 매출 블록(revenueStructure · seoulRank · revenue*)만 null 로 온다.
 *
 *    2) 분모가 0 인 비율 — 서버의 ratio() 가 분모 0 이면 null 을 준다
 *       (MarketServiceImpl). 그 동에 해당 업종 점포가 0 곳이거나 매출 합계가 0 이면
 *       비율·점포당 지표가 전부 null 이다. 나눗셈 결과인 필드는 전부 여기 해당한다.
 *
 *    곳·명·원 단위(점포 수, 유동인구, 금액 합계)는 원본 값이라 null 이 아니다.
 */

/** 조회 파라미터 */
export interface MarketAnalysisParams {
  /** 행정동 코드. '11440375' */
  dongCode: string
  /** 업종 코드. 'CS100001' */
  businessCode: string
  /** 주변 상권 비교 표에 넣을 행 수 */
  compareLimit?: number
  /** 업종 구성 항목 수 */
  mixLimit?: number
}

export interface MarketMeta {
  /** 데이터 기준 분기. 'YYYY' + 분기 두 자리. '202602' = 2026년 2분기 */
  dataQuarter: string
  /**
   * 분기 값을 월·일로 바꿀 때 나눈 수.
   * ⚠️ revenuePerStoreMonthly 처럼 이미 월 단위로 나뉜 값이 오는데 이걸 왜 주는지
   *    확인 대기 중이다. 프론트에서 쓰지 않는다.
   */
  monthlyDivisor: number
  dailyDivisor: number
}

export interface MarketLocation {
  cityName: string
  districtCode: string
  districtName: string
  dongCode: string
  dongName: string
}

/** 응답에는 이름 한 개만 온다. 대>중>소 3단 표기는 모달에서 고른 값을 기억해야 만든다 */
export interface MarketBusinessCategory {
  code: string
  name: string
}

export interface StoreCountBenchmark {
  seoulAvg: number
  districtAvg: number
}

export interface FootTrafficGender {
  maleRatio: number | null
  femaleRatio: number | null
}

export interface RevenueBenchmark {
  seoulAvg: number
  seoulMedian: number
  /** ⚠️ '서울 전체 상위 25%' 인지 '같은 업종 상위 25%' 인지 확인 대기 */
  seoulTop25: number
}

export interface MarketSummary {
  storeCount: number
  storeCountBenchmark: StoreCountBenchmark
  dailyFootTraffic: number
  /** 점포 한 곳이 하루에 마주치는 유동인구. 점포가 0 곳이면 null */
  footTrafficPerStoreDaily: number | null
  footTrafficGender: FootTrafficGender
  /** 점포당 월 매출(원) */
  revenuePerStoreMonthly: number | null
  revenuePerStoreBenchmark: RevenueBenchmark | null
}

/** 동종업종 점포 수 비교. summary.storeCountBenchmark 와 값이 같고 dong 이 더 붙는다 */
export interface MarketDensity {
  seoulAvg: number
  districtAvg: number
  dong: number
}

/** 주변 상권 비교 표의 한 행. 조회한 행정동도 이 배열에 포함된다 */
export interface NeighborMarket {
  dongCode: string
  dongName: string
  storeCount: number
  dailyFootTraffic: number
  footTrafficPerStoreDaily: number | null
  revenuePerStoreMonthly: number | null
  /** 연 폐업률(%). 그 동에 점포가 0 곳이면 null */
  annualCloseRate: number | null
}

export interface RevenueByDayType {
  weekdayRatio: number | null
  weekendRatio: number | null
  weekdayRevenueMonthly: number
  weekendRevenueMonthly: number
}

export interface RevenueByGender {
  maleRatio: number | null
  femaleRatio: number | null
  maleRevenueMonthly: number
  femaleRevenueMonthly: number
  /**
   * 성별이 확인된 매출 비중(%). 100 이 아니면 미상이 섞여 있다는 뜻.
   * 매출 합계가 0 이면 null
   */
  coverageRatio: number | null
}

export interface RevenueStructure {
  byDayType: RevenueByDayType
  byGender: RevenueByGender
}

export interface BusinessMixItem {
  code: string
  name: string
  storeCount: number
  /**
   * 전체 점포 대비 비율(%). 합이 100 이 안 되므로 '기타' 는 프론트가 계산한다.
   * 동 전체 점포가 0 곳이면 null
   */
  sharePercent: number | null
}

export interface BusinessMix {
  /** 업종 무관 전체 점포 수. items 의 storeCount 합보다 크다 */
  totalStoreCount: number
  items: BusinessMixItem[]
}

export interface SeoulRank {
  /** 서울 내 백분위. 74 면 하위 74% 지점 = 상위 26% */
  percentile: number
  topPercent: number
  seoulMedian: number
}

export interface StoreChurn {
  opened: number
  closed: number
  /** opened - closed. 음수면 줄어드는 상권이다 */
  net: number
  /** 세 비율 모두 점포 수가 분모라 0 곳이면 null */
  annualCloseRate: number | null
  annualOpenRate: number | null
  seoulAvgCloseRate: number | null
}

export interface MarketAnalysis {
  meta: MarketMeta
  location: MarketLocation
  business: MarketBusinessCategory
  summary: MarketSummary
  density: MarketDensity
  neighbors: NeighborMarket[]
  revenueStructure: RevenueStructure | null
  businessMix: BusinessMix
  seoulRank: SeoulRank | null
  storeChurn: StoreChurn
}
