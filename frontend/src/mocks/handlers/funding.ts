import { http, HttpResponse } from 'msw'

import type { FundingRecommendData } from '@/features/funding-plan/model/types'
import type { ApiResponse } from '@/shared/types'

/**
 * 자금 조합 목.
 *
 * 시안의 세 조합을 재현했다. 목표 금액에 딱 맞는 조합(1·2)과 넘치는 조합(3)을 섞어
 * 뒀다 — 상품마다 최소 금액이 있어 딱 맞추지 못하는 경우가 실제로 나올 수 있고,
 * 그때 화면이 어떻게 보이는지 확인할 수 있어야 한다.
 *
 * 첫 조합의 바우처는 interestRate 0 이다. '무상' 으로 나오는지 확인용이다.
 */
function build(targetAmount: number): FundingRecommendData {
  // 목표 금액에 비례해 나눠 담는다. 금액을 바꿔가며 눌러볼 수 있게
  const grant = Math.min(5_000_000, Math.floor(targetAmount * 0.1))
  const rest = targetAmount - grant
  const core = Math.floor(rest * 0.67)

  return {
    recommendedCombinations: [
      {
        items: [
          {
            type: 'SUPPORT',
            id: 21,
            name: '스마트상점 바우처',
            supportAmount: grant,
            interestRate: 0,
          },
          {
            type: 'LOAN',
            id: 2,
            name: '소진공 일반경영안정자금',
            supportAmount: core,
            interestRate: 3.4,
          },
          {
            type: 'LOAN',
            id: 7,
            name: '지역신보 보증부 대출',
            supportAmount: rest - core,
            interestRate: 4.1,
          },
        ],
        totalFinancingAmount: targetAmount,
        averageInterestRate: 3.3,
        monthlyRepaymentAmount: 1_320_000,
        totalInterest: 2_560_000,
      },
      {
        items: [
          {
            type: 'LOAN',
            id: 2,
            name: '소진공 일반경영안정자금',
            supportAmount: targetAmount,
            interestRate: 3.4,
          },
        ],
        totalFinancingAmount: targetAmount,
        averageInterestRate: 3.4,
        monthlyRepaymentAmount: 1_460_000,
        totalInterest: 2_670_000,
      },
      {
        // 목표를 넘기는 조합. 상품 최소 금액 때문에 딱 맞추지 못한 경우
        items: [
          {
            type: 'SUPPORT',
            id: 21,
            name: '스마트상점 바우처',
            supportAmount: 5_000_000,
            interestRate: 0,
          },
          {
            type: 'LOAN',
            id: 7,
            name: '지역신보 보증부 대출',
            supportAmount: 35_000_000,
            interestRate: 4.1,
          },
          {
            type: 'SUPPORT',
            id: 13,
            name: '스마트화 전환 보증재단 자금',
            supportAmount: 20_000_000,
            interestRate: 2.8,
          },
        ],
        totalFinancingAmount: 60_000_000,
        averageInterestRate: 3.6,
        monthlyRepaymentAmount: 1_330_000,
        totalInterest: 2_770_000,
      },
    ],
  }
}

export const fundingHandlers = [
  http.post('/api/v1/funding/recommend', async ({ request }) => {
    const { targetAmount } = (await request.json()) as { targetAmount: number }

    if (!targetAmount || targetAmount <= 0) {
      return HttpResponse.json(
        {
          statusCode: 400,
          timestamp: '2026-09-11T10:00:00',
          path: '/api/v1/funding/recommend',
          message: '유효하지 않은 요청입니다.',
          data: null,
          error: 'INVALID_REQUEST',
        },
        { status: 400 },
      )
    }

    return HttpResponse.json({
      statusCode: 200,
      timestamp: '2026-09-11T10:00:00',
      path: '/api/v1/funding/recommend',
      message: '자금 조합 추천에 성공하였습니다.',
      data: build(targetAmount),
      error: null,
    } satisfies ApiResponse<FundingRecommendData>)
  }),

  http.post('/api/v1/funding/batch', () =>
    HttpResponse.json({
      statusCode: 200,
      timestamp: '2026-09-11T10:00:00',
      path: '/api/v1/funding/batch',
      message: '조합 기반 신청목록 생성에 성공하였습니다.',
      data: null,
      error: null,
    } satisfies ApiResponse<null>),
  ),
]