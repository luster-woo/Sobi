import { http } from 'msw'

import type { FundingItem, FundingRecommendData } from '@/features/funding-plan/model/types'
import { createApplicationFromBatch } from '@/mocks/handlers/application'
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
 *
 * ⚠️ 여기 쓰는 상품은 신청 목에 진행 중·지급 완료 건이 없는 것이어야 한다. 서버가
 *    후보에서 그런 상품을 빼기 때문이다(FundingService.getFundingCandidates). 막힌
 *    상품을 넣어 두면 '이 조합으로 진행' 이 목에서만 409 로 죽어서, 실서버에서는
 *    되는 기능을 고장난 것으로 오해하게 된다.
 *
 *    신청 목이 잡고 있는 상품 — 대출 1(승인) · 2(지급 완료) · 3(신청 완료),
 *    지원사업 1(지급 완료) · 7(심사 중). 이 다섯은 쓰지 않는다.
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
          supportItem(3, 'GRANT', grant, 0),
          loanItem(4, core, 3.4),
          loanItem(5, rest - core, 4.1),
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
        items: [loanItem(4, targetAmount, 3.4)],
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
          supportItem(3, 'GRANT', 5_000_000, 0),
          loanItem(5, 35_000_000, 4.1),
          // 지원사업인데 이자를 내는 융자성 상품. 2번 공고가 목에서 LOAN 타입이다
          supportItem(6, 'LOAN', 20_000_000, 2.8),
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

  /**
   * 고른 조합으로 신청 생성.
   *
   * 신청 목의 생성 함수를 항목마다 부른다. 서버도 FundingService 가
   * ApplicationService.create() 를 그대로 부르므로 같은 경로를 타게 둔다 — 여기서
   * 신청을 따로 만들면 중복·마감 규칙이 두 벌이 되어 목만 통과하는 코드가 생긴다.
   *
   * 실패하면 거기서 멈추고 500 을 준다. 서버가 반복문 안에서 예외를 잡지 않아 그대로
   * 밖으로 나가기 때문이다 — 앞의 항목은 이미 만들어진 채로 실패한다. 화면의
   * '일부만 시작됐을 수 있어요' 안내가 이 경우를 위한 것이라, 목도 같게 둬야 눌러볼 수 있다.
   */
  http.post('/api/v1/funding/batch', async ({ request }) => {
    const path = '/api/v1/funding/batch'
    const { item } = (await request.json()) as { item: { type: string; id: number }[] }

    if (!Array.isArray(item) || item.length === 0) {
      return fail(400, 'COMMON_001', '신청할 상품이 없습니다.', path)
    }

    for (const batchItem of item) {
      const result = createApplicationFromBatch(batchItem.type, batchItem.id)

      if (!result.ok) {
        return fail(500, 'COMMON_002', result.message, path)
      }
    }

    return ok(null, '조합 기반 신청목록 생성에 성공하였습니다.', { path })
  }),
]
