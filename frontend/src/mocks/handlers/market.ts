import { http } from 'msw'

import type { MarketAnalysis } from '@/features/market-analysis/model/types'
import { fail, ok } from '@/mocks/lib/envelope'
import type { BusinessTree, RegionTree } from '@/shared/types/commonCode'

/**
 * 상권 분석 목.
 *
 * 명세의 응답 예시(마포구 서교동 · 한식음식점)를 그대로 옮겼다.
 *
 * 원본 데이터에 매출이 빈 행이 53% 라 그 경우도 눌러볼 수 있어야 한다. 그래서 상암동
 * (11440700)을 매출 전부 null 인 응답으로 따로 뒀다. 화면을 만들 때 두 동을 번갈아
 * 열어보면 null 처리가 빠진 자리가 바로 드러난다.
 */
const 서교동: MarketAnalysis = {
  meta: { dataQuarter: '202602', monthlyDivisor: 3, dailyDivisor: 90 },
  location: {
    cityName: '서울특별시',
    districtCode: '11440',
    districtName: '마포구',
    dongCode: '11440375',
    dongName: '서교동',
  },
  business: { code: 'CS100001', name: '한식음식점' },
  summary: {
    storeCount: 868,
    storeCountBenchmark: { seoulAvg: 137.8, districtAvg: 202.0 },
    dailyFootTraffic: 191734,
    footTrafficPerStoreDaily: 221,
    footTrafficGender: { maleRatio: 44.3, femaleRatio: 55.7 },
    revenuePerStoreMonthly: 25019665,
    revenuePerStoreBenchmark: {
      seoulAvg: 20520622,
      seoulMedian: 19035137,
      seoulTop25: 25327569,
    },
  },
  density: { seoulAvg: 138, districtAvg: 202, dong: 868 },
  neighbors: [
    {
      dongCode: '11440375',
      dongName: '서교동',
      storeCount: 868,
      dailyFootTraffic: 191734,
      footTrafficPerStoreDaily: 221,
      revenuePerStoreMonthly: 25019665,
      annualCloseRate: 17.5,
    },
    {
      // 점포가 0 곳이라 나눗셈이 성립하지 않는 동. 서버가 비율을 null 로 준다
      dongCode: '11440590',
      dongName: '성산1동',
      storeCount: 0,
      dailyFootTraffic: 31200,
      footTrafficPerStoreDaily: null,
      revenuePerStoreMonthly: null,
      annualCloseRate: null,
    },
    {
      dongCode: '11440700',
      dongName: '상암동',
      storeCount: 326,
      dailyFootTraffic: 59870,
      footTrafficPerStoreDaily: 184,
      revenuePerStoreMonthly: 18740846,
      annualCloseRate: 17.8,
    },
    {
      dongCode: '11440640',
      dongName: '공덕동',
      storeCount: 224,
      dailyFootTraffic: 132695,
      footTrafficPerStoreDaily: 592,
      revenuePerStoreMonthly: 19959383,
      annualCloseRate: 11.6,
    },
    {
      dongCode: '11440400',
      dongName: '연남동',
      storeCount: 207,
      dailyFootTraffic: 72433,
      footTrafficPerStoreDaily: 350,
      revenuePerStoreMonthly: 13857616,
      annualCloseRate: 15.0,
    },
    {
      dongCode: '11440390',
      dongName: '합정동',
      storeCount: 204,
      dailyFootTraffic: 49422,
      footTrafficPerStoreDaily: 242,
      revenuePerStoreMonthly: 23654126,
      annualCloseRate: 12.7,
    },
    {
      dongCode: '11440610',
      dongName: '용강동',
      storeCount: 203,
      dailyFootTraffic: 61332,
      footTrafficPerStoreDaily: 302,
      revenuePerStoreMonthly: 32783519,
      annualCloseRate: 16.3,
    },
    {
      dongCode: '11440510',
      dongName: '망원1동',
      storeCount: 181,
      dailyFootTraffic: 74134,
      footTrafficPerStoreDaily: 410,
      revenuePerStoreMonthly: 20303277,
      annualCloseRate: 18.8,
    },
  ],
  revenueStructure: {
    byDayType: {
      weekdayRatio: 65.1,
      weekendRatio: 34.9,
      weekdayRevenueMonthly: 14142455534,
      weekendRevenueMonthly: 7574613542,
    },
    byGender: {
      maleRatio: 54.4,
      femaleRatio: 45.6,
      maleRevenueMonthly: 10321292484,
      femaleRevenueMonthly: 8665426174,
      coverageRatio: 87.4,
    },
  },
  businessMix: {
    totalStoreCount: 8783,
    items: [
      { code: 'CS100001', name: '한식음식점', storeCount: 868, sharePercent: 9.9 },
      { code: 'CS100010', name: '커피-음료', storeCount: 702, sharePercent: 8.0 },
      { code: 'CS300019', name: '일반의류', storeCount: 582, sharePercent: 6.6 },
      { code: 'CS100008', name: '호프-간이주점', storeCount: 453, sharePercent: 5.2 },
      { code: 'CS200003', name: '미용실', storeCount: 400, sharePercent: 4.6 },
      { code: 'CS200030', name: '부동산중개업', storeCount: 286, sharePercent: 3.3 },
    ],
  },
  seoulRank: { percentile: 74, topPercent: 26, seoulMedian: 19035137 },
  storeChurn: {
    opened: 144,
    closed: 152,
    net: -8,
    annualCloseRate: 17.5,
    annualOpenRate: 16.6,
    seoulAvgCloseRate: 15.1,
  },
}

/** 매출이 전부 null 인 경우 (원본의 53%) */
const 상암동: MarketAnalysis = {
  ...서교동,
  location: { ...서교동.location, dongCode: '11440700', dongName: '상암동' },
  summary: {
    ...서교동.summary,
    storeCount: 326,
    dailyFootTraffic: 59870,
    footTrafficPerStoreDaily: 184,
    revenuePerStoreMonthly: null,
    revenuePerStoreBenchmark: null,
  },
  density: { ...서교동.density, dong: 326 },
  neighbors: 서교동.neighbors.map((n) => ({ ...n, revenuePerStoreMonthly: null })),
  revenueStructure: null,
  seoulRank: null,
}

/**
 * 그 동에 해당 업종 점포가 한 곳도 없는 경우.
 *
 * 서버의 ratio() 가 분모 0 이면 null 을 준다(MarketServiceImpl). 그래서 매출뿐 아니라
 * 비율·점포당 지표가 전부 null 이다. 매출만 비는 상암동과 다른 경로라 따로 둔다.
 */
const 성산1동: MarketAnalysis = {
  ...서교동,
  location: { ...서교동.location, dongCode: '11440590', dongName: '성산1동' },
  summary: {
    ...서교동.summary,
    storeCount: 0,
    dailyFootTraffic: 31200,
    footTrafficPerStoreDaily: null,
    footTrafficGender: { maleRatio: null, femaleRatio: null },
    revenuePerStoreMonthly: null,
    revenuePerStoreBenchmark: null,
  },
  density: { ...서교동.density, dong: 0 },
  businessMix: {
    totalStoreCount: 0,
    items: 서교동.businessMix.items.map((item) => ({
      ...item,
      storeCount: 0,
      sharePercent: null,
    })),
  },
  revenueStructure: null,
  seoulRank: null,
  storeChurn: {
    opened: 0,
    closed: 0,
    net: 0,
    annualCloseRate: null,
    annualOpenRate: null,
    seoulAvgCloseRate: null,
  },
}

const BY_DONG: Record<string, MarketAnalysis> = {
  '11440375': 서교동,
  '11440700': 상암동,
  '11440590': 성산1동,
}

/**
 * 조건 입력용 목록.
 *
 * 실제로는 서울 25개 자치구·400여 행정동, 업종 수백 개가 온다. 목에는 화면 동작을
 * 확인할 만큼만 둔다.
 *
 * 마포구의 행정동 코드는 위 상권 분석 목(BY_DONG)과 맞춰 뒀다. 서교동·상암동을 고르면
 * 실제로 결과가 나오고 나머지를 고르면 MARKET_001 이 뜬다 — 실제 서비스에도 데이터가
 * 없는 동이 있을 수 있어서 그 경로를 눌러볼 수 있어야 한다.
 */
const REGION_TREE: RegionTree = {
  cityName: '서울특별시',
  districts: [
    {
      code: '11440',
      name: '마포구',
      dongs: [
        { code: '11440375', name: '서교동' },
        { code: '11440700', name: '상암동' },
        { code: '11440640', name: '공덕동' },
        { code: '11440400', name: '연남동' },
        { code: '11440590', name: '성산1동' },
      ],
    },
    {
      code: '11110',
      name: '종로구',
      dongs: [
        { code: '11110515', name: '청운효자동' },
        { code: '11110530', name: '사직동' },
        { code: '11110540', name: '삼청동' },
      ],
    },
    {
      code: '11740',
      name: '강동구',
      dongs: [
        { code: '11740690', name: '둔촌1동' },
        { code: '11740700', name: '둔촌2동' },
      ],
    },
  ],
}

const BUSINESS_TREE: BusinessTree = {
  majors: [
    {
      code: 'CS100',
      name: '외식업',
      subs: [
        {
          code: 'M01',
          name: '음식점',
          minors: [
            { code: 'CS100001', name: '한식음식점' },
            { code: 'CS100002', name: '중식음식점' },
            { code: 'CS100008', name: '호프-간이주점' },
          ],
        },
        {
          code: 'M02',
          name: '카페_제과',
          minors: [
            { code: 'CS100005', name: '제과점' },
            { code: 'CS100010', name: '커피-음료' },
          ],
        },
      ],
    },
    {
      code: 'CS200',
      name: '서비스업',
      subs: [
        {
          code: 'M04',
          name: '학원_교육',
          minors: [{ code: 'CS200001', name: '일반교습학원' }],
        },
        {
          code: 'M09',
          name: '미용',
          minors: [{ code: 'CS200003', name: '미용실' }],
        },
      ],
    },
    {
      code: 'CS300',
      name: '소매업',
      subs: [
        {
          code: 'M21',
          name: '기타소매',
          minors: [{ code: 'CS300043', name: '전자상거래업' }],
        },
      ],
    },
  ],
}

export const marketHandlers = [
  http.get('/api/v1/common/market/regions', () =>
    ok<RegionTree>(REGION_TREE, '행정동 목록 조회에 성공하였습니다.', {
      path: '/api/v1/common/market/regions',
    }),
  ),

  http.get('/api/v1/common/market/businesses', () =>
    ok<BusinessTree>(BUSINESS_TREE, '업종 목록 조회에 성공하였습니다.', {
      path: '/api/v1/common/market/businesses',
    }),
  ),

  http.get('/api/v1/common/market', ({ request }) => {
    const params = new URL(request.url).searchParams
    const dongCode = params.get('dongCode') ?? ''
    const found = BY_DONG[dongCode]

    if (!found) {
      return fail(404, 'MARKET_001', '존재하지 않는 행정동입니다.', '/api/v1/common/market')
    }

    // 파라미터로 행수를 자르는 것까지 서버 동작을 따라간다
    const compareLimit = Number(params.get('compareLimit')) || found.neighbors.length
    const mixLimit = Number(params.get('mixLimit')) || found.businessMix.items.length

    return ok<MarketAnalysis>(
      {
        ...found,
        neighbors: found.neighbors.slice(0, compareLimit),
        businessMix: {
          ...found.businessMix,
          items: found.businessMix.items.slice(0, mixLimit),
        },
      },
      '상권 분석 조회 성공.',
      { path: '/api/v1/common/market' },
    )
  }),
]
