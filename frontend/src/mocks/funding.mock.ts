import type { FundingMix } from '@/shared/types'

export const mockFundingMixes: FundingMix[] = [
  {
    id: 'mix-1',
    title: '추천 조합 1',
    badge: '이자 최소',
    items: [
      { name: '스마트상점 바우처', amount: 5_000_000, rate: null },
      { name: '소진공 일반경영안정자금', amount: 30_000_000, rate: 3.4 },
      { name: '지역신보 보증부 대출', amount: 15_000_000, rate: 4.1 },
    ],
    total: 50_000_000,
    avgRate: 3.3,
    monthly: 1_320_000,
    totalInterest: 2_560_000,
    summary: '바우처 500 + 안정자금 3,000 + 보증부 1,500',
    notes: [
      '무상 바우처 500만 원을 먼저 채워 대출 원금 자체를 줄였어요',
      '남은 금액은 저금리 정책자금(연 3.4%) 위주로 구성했어요',
      '월 상환 132만 — 최근 월 매출(3,240만 원)의 4% 수준이에요',
    ],
  },
  {
    id: 'mix-2',
    title: '추천 조합 2',
    items: [{ name: '소진공 일반경영안정자금', amount: 50_000_000, rate: 3.4 }],
    total: 50_000_000,
    avgRate: 3.4,
    monthly: 1_460_000,
    totalInterest: 2_670_000,
    summary: '안정자금 5,000',
    notes: ['월 상환 146만 원 - 총 이자 267만 원 - 심사 1곳으로 가장 빨라요'],
  },
  {
    id: 'mix-3',
    title: '추천 조합 3',
    items: [
      { name: '지역신보 보증부 대출', amount: 35_000_000, rate: 4.1 },
      { name: '스마트상점 바우처', amount: 5_000_000, rate: null },
      { name: '소진공 일반경영안정자금', amount: 10_000_000, rate: 3.4 },
    ],
    total: 50_000_000,
    avgRate: 3.6,
    monthly: 1_330_000,
    totalInterest: 2_770_000,
    summary: '보증부 3,500 + 바우처 500 + 안정자금 1,000',
    notes: ['월 상환 133만 원 - 총 이자 277만 원·신용 한도를 남겨둬요'],
  },
]
