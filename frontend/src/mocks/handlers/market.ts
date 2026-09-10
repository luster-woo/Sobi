import { http, HttpResponse } from 'msw'

import type { MarketAnalysis } from '@/features/market-analysis/model/types'
import type { ApiResponse } from '@/shared/types'

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

const BY_DONG: Record<string, MarketAnalysis> = {
  '11440375': 서교동,
  '11440700': 상암동,
}

export const marketHandlers = [
  http.get('/api/v1/common/market', ({ request }) => {
    const params = new URL(request.url).searchParams
    const dongCode = params.get('dongCode') ?? ''
    const found = BY_DONG[dongCode]

    if (!found) {
      return HttpResponse.json(
        {
          statusCode: 404,
          timestamp: '2026-09-10T10:00:00',
          path: '/api/v1/common/market',
          message: '존재하지 않는 행정동입니다.',
          data: null,
          error: { code: 'MARKET_001' },
        },
        { status: 404 },
      )
    }

    // 파라미터로 행수를 자르는 것까지 서버 동작을 따라간다. 화면에서 개수를 바꿔볼 수 있다
    const compareLimit = Number(params.get('compareLimit')) || found.neighbors.length
    const mixLimit = Number(params.get('mixLimit')) || found.businessMix.items.length

    const body: ApiResponse<MarketAnalysis> = {
      statusCode: 200,
      timestamp: '2026-09-10T10:00:00',
      path: '/api/v1/common/market',
      message: '상권 분석 조회 성공.',
      data: {
        ...found,
        neighbors: found.neighbors.slice(0, compareLimit),
        businessMix: {
          ...found.businessMix,
          items: found.businessMix.items.slice(0, mixLimit),
        },
      },
      error: null,
    }

    return HttpResponse.json(body)
  }),
]
