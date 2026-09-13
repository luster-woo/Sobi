import type { FundingCombination } from '@/features/funding-plan/model/types'
import Button from '@/shared/ui/Button'
import Panel from '@/shared/ui/Panel'
import { formatMoneyShort } from '@/shared/utils/formatters'

interface FundingCombinationSummaryCardProps {
  combination: FundingCombination
  order: number
  onSelect: () => void
}

/**
 * 대표로 뽑히지 않은 조합들의 요약 카드.
 *
 * 구성을 '상품명 금액' 으로 한 줄에 이어 쓴다. 대표 카드처럼 목록으로 펼치면 카드가
 * 길어져서, 선택 전에 훑어보는 용도라는 성격과 맞지 않는다.
 *
 * 상품이 셋을 넘으면 뒤를 '외 n건' 으로 접는다. 좁은 카드에서 줄바꿈이 길어지면
 * 아래 숫자가 눌린다.
 */
export default function FundingCombinationSummaryCard({
  combination,
  order,
  onSelect,
}: FundingCombinationSummaryCardProps) {
  const shown = combination.items.slice(0, 3)
  const hidden = combination.items.length - shown.length

  const composition = shown
    .map((item) => `${item.name} ${formatMoneyShort(item.allocatedAmount)}`)
    .join(' + ')

  return (
    <Panel>
      <div className="flex flex-col gap-2.5 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-text text-[13.5px] font-bold">추천 조합 {order}</h3>

          <Button variant="outline" size="sm" className="shrink-0" onClick={onSelect}>
            이 조합 선택
          </Button>
        </div>

        <p className="text-text-secondary text-[12px] leading-relaxed">
          {composition}
          {hidden > 0 && ` 외 ${hidden}건`}
        </p>

        <p className="text-text-secondary border-border-subtle border-t pt-2.5 text-[11.5px] tabular-nums">
          평균 연 {combination.averageInterestRate}% · 월 상환{' '}
          {formatMoneyShort(combination.monthlyRepaymentAmount)} · 총 이자{' '}
          {formatMoneyShort(combination.totalInterest)}
        </p>
      </div>
    </Panel>
  )
}
