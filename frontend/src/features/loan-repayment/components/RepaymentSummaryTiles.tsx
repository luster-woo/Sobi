import type { RepaymentProgress } from '@/features/loan-repayment/model/progress'
import type { LoanProduct, RepaymentDetail } from '@/features/loan-repayment/model/types'
import type { StatTile } from '@/shared/ui/StatTiles'
import StatTiles from '@/shared/ui/StatTiles'
import { splitMoneyShort } from '@/shared/utils/formatters'

interface RepaymentSummaryTilesProps {
  product: LoanProduct
  detail: RepaymentDetail
  progress: RepaymentProgress
}

/**
 * 요약 타일 4개.
 *
 * 시안의 '이번 달 상환액' 과 '다음 상환일' 을 바꿨다. 금융망이 매일 08:30 에 한 회차씩
 * 상환해서 '이번 달' 이라는 단위가 없고, '다음 상환일' 은 언제나 내일이라 정보가 없다.
 *   이번 달 상환액 → 다음 날 상환액 (dailyDueAmount)
 *   다음 상환일    → 남은 회차
 */
export default function RepaymentSummaryTiles({
  product,
  detail,
  progress,
}: RepaymentSummaryTilesProps) {
  const remaining = splitMoneyShort(detail.remainingLoanBalance)
  const daily = splitMoneyShort(product.dailyDueAmount)

  const tiles: StatTile[] = [
    { label: '대출 잔액', ...remaining },
    { label: '다음 날 상환액', ...daily },
    { label: '남은 회차', value: progress.remainingCount.toLocaleString('ko-KR'), unit: '회' },
    { label: '현재 적용 금리', value: `연 ${product.interestRate}`, unit: '%' },
  ]

  return <StatTiles items={tiles} />
}
