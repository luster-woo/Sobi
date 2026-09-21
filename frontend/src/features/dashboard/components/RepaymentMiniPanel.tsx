import MiniKeyValues from '@/features/dashboard/components/MiniKeyValues'
import MiniPanel from '@/features/dashboard/components/MiniPanel'
import { daysUntil, toManwon, toShortDate } from '@/features/dashboard/model/format'
import type { RepaymentSummary } from '@/features/dashboard/model/types'
import { ROUTES } from '@/shared/constants/routes'

interface RepaymentMiniPanelProps {
  repayment: RepaymentSummary
}

/** '9. 15 · 13일 남음'. 지난 날짜면 남은 일수 대신 연체를 알린다 */
function toDueLabel(nextDate: string): string {
  const left = daysUntil(nextDate)
  const date = toShortDate(nextDate)

  // 날짜를 못 읽으면 남은 일수를 지어내지 않는다
  if (left === null) return '다음 상환일을 확인하지 못했어요'
  if (left < 0) return `상환일 ${date} 지남 · 연체 확인 필요`
  if (left === 0) return `상환일 ${date} · 오늘`
  return `다음 상환일 ${date} · ${left}일 남음`
}

/**
 * 상환 관리 요약.
 *
 * 날짜를 제목 위에 둔다. 이 카드에서 놓치면 안 되는 것은 금액이 아니라 언제까지인지다 —
 * 금액은 계좌에 있으면 되지만 날짜를 넘기면 연체가 된다.
 */
export default function RepaymentMiniPanel({ repayment }: RepaymentMiniPanelProps) {
  const monthly = toManwon(repayment.monthlyAmount)
  const balance = toManwon(repayment.totalBalance)

  return (
    <MiniPanel
      label={toDueLabel(repayment.nextDate)}
      title="상환 관리"
      to={ROUTES.LOAN_REPAYMENTS}
      note={repayment.advice}
    >
      <MiniKeyValues
        items={[
          { label: '이번 달 상환액', value: monthly.value, unit: monthly.unit },
          { label: '총 대출 잔액', value: balance.value, unit: balance.unit },
        ]}
      />
    </MiniPanel>
  )
}
