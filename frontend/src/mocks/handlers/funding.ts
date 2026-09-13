import { http } from 'msw'

import type { FundingRecommendData } from '@/features/funding-plan/model/types'
import { fail, ok } from '@/mocks/lib/envelope'

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
    targetAmount,
    recommendedCombinations: [
      {
        items: [
          {
            sourceType: 'SUPPORT_PROGRAM',
            fundingType: 'GRANT',
            id: 21,
            name: '스마트상점 바우처',
            allocatedAmount: grant,
            interestRate: 0,
          },
          {
            sourceType: 'LOAN_PRODUCT',
            fundingType: 'LOAN',
            id: 2,
            name: '소진공 일반경영안정자금',
            allocatedAmount: core,
            interestRate: 3.4,
          },
          {
            sourceType: 'LOAN_PRODUCT',
            fundingType: 'LOAN',
            id: 7,
            name: '지역신보 보증부 대출',
            allocatedAmount: rest - core,
            interestRate: 4.1,
          },
        ],
        totalFinancingAmount: targetAmount,
        grantAmount: grant,
        loanPrincipal: rest,
        averageInterestRate: 3.6,
        monthlyRepaymentAmount: 1_320_000,
        totalInterest: 2_560_000,
        totalRepaymentAmount: rest + 2_560_000,
      },
      {
        items: [
          {
            sourceType: 'LOAN_PRODUCT',
            fundingType: 'LOAN',
            id: 2,
            name: '소진공 일반경영안정자금',
            allocatedAmount: targetAmount,
            interestRate: 3.4,
          },
        ],
        totalFinancingAmount: targetAmount,
        grantAmount: 0,
        loanPrincipal: targetAmount,
        averageInterestRate: 3.4,
        monthlyRepaymentAmount: 1_460_000,
        totalInterest: 2_670_000,
        totalRepaymentAmount: targetAmount + 2_670_000,
      },
      {
        // 목표를 넘기는 조합. 상품 최소 금액 때문에 딱 맞추지 못한 경우
        items: [
          {
            sourceType: 'SUPPORT_PROGRAM',
            fundingType: 'GRANT',
            id: 21,
            name: '스마트상점 바우처',
            allocatedAmount: 5_000_000,
            interestRate: 0,
          },
          {
            sourceType: 'LOAN_PRODUCT',
            fundingType: 'LOAN',
            id: 7,
            name: '지역신보 보증부 대출',
            allocatedAmount: 35_000_000,
            interestRate: 4.1,
          },
          {
            // 지원사업인데 이자를 내는 융자성 상품. fundingType 이 LOAN 이다
            sourceType: 'SUPPORT_PROGRAM',
            fundingType: 'LOAN',
            id: 13,
            name: '스마트화 전환 보증재단 자금',
            allocatedAmount: 20_000_000,
            interestRate: 2.8,
          },
        ],
        totalFinancingAmount: 60_000_000,
        grantAmount: 5_000_000,
        loanPrincipal: 55_000_000,
        averageInterestRate: 3.6,
        monthlyRepaymentAmount: 1_330_000,
        totalInterest: 2_770_000,
        totalRepaymentAmount: 57_770_000,
      },
    ],
  }
}

export const fundingHandlers = [
  http.post('/api/v1/funding/recommend', async ({ request }) => {
    const { targetAmount } = (await request.json()) as { targetAmount: number }

    if (!targetAmount || targetAmount <= 0) {
      return fail(
        400,
        'COMMON_001',
        '입력값 중에 기준을 만족하지 않은 입력값이 있습니다.',
        '/api/v1/funding/recommend',
      )
    }

    return ok(build(targetAmount), '자금 조합 추천에 성공하였습니다.', {
      path: '/api/v1/funding/recommend',
    })
  }),

  http.post('/api/v1/funding/batch', () =>
    ok(null, '조합 기반 신청목록 생성에 성공하였습니다.', { path: '/api/v1/funding/batch' }),
  ),
]
