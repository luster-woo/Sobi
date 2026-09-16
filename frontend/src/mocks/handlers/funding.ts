import { http } from 'msw'

import type { FundingItem, FundingRecommendData } from '@/features/funding-plan/model/types'
import { findLoanProductSummary } from '@/mocks/handlers/loan'
import { findSupportProductSummary } from '@/mocks/handlers/support'
import { fail, ok } from '@/mocks/lib/envelope'

/**
 * 상품 이름을 대출·지원사업 목에서 가져온다.
 *
 * 손으로 적어 두면 카드에 뜬 이름과 상세 모달에 뜬 이름이 서로 다르다. 조합 항목을
 * 눌러 상세를 여는 화면이 생기면서 그 어긋남이 그대로 드러난다.
 *
 * 없는 id 를 쓰면 여기서 막힌다 — 이름이 '(목에 없는 상품 N)' 으로 나오므로
 * 화면을 한 번만 열어봐도 알아챈다.
 */
function loanItem(loanId: number, allocatedAmount: number, interestRate: number): FundingItem {
  return {
    sourceType: 'LOAN_PRODUCT',
    fundingType: 'LOAN',
    id: loanId,
    name: findLoanProductSummary(loanId)?.accountName ?? `(목에 없는 상품 ${loanId})`,
    allocatedAmount,
    interestRate,
  }
}

function supportItem(
  supportProgramId: number,
  fundingType: FundingItem['fundingType'],
  allocatedAmount: number,
  interestRate: number,
): FundingItem {
  return {
    sourceType: 'SUPPORT_PROGRAM',
    fundingType,
    id: supportProgramId,
    name:
      findSupportProductSummary(supportProgramId)?.programName ??
      `(목에 없는 공고 ${supportProgramId})`,
    allocatedAmount,
    interestRate,
  }
}

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
        // 1번 공고는 지원사업 목에서 SUPPORT(무상) 타입이다
        items: [
          supportItem(1, 'GRANT', grant, 0),
          loanItem(2, core, 3.4),
          loanItem(3, rest - core, 4.1),
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
        items: [loanItem(2, targetAmount, 3.4)],
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
          supportItem(1, 'GRANT', 5_000_000, 0),
          loanItem(3, 35_000_000, 4.1),
          // 지원사업인데 이자를 내는 융자성 상품. 2번 공고가 목에서 LOAN 타입이다
          supportItem(2, 'LOAN', 20_000_000, 2.8),
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
