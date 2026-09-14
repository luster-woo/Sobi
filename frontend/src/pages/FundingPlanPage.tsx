import { useState } from 'react'
import { useSearchParams } from 'react-router'

import FundingAmountForm from '@/features/funding-plan/components/FundingAmountForm'
import FundingCombinationCard from '@/features/funding-plan/components/FundingCombinationCard'
import FundingCombinationSummaryCard from '@/features/funding-plan/components/FundingCombinationSummaryCard'
import FundingComparisonTable from '@/features/funding-plan/components/FundingComparisonTable'
import { useFundingRecommend } from '@/features/funding-plan/hooks/useFundingRecommend'
import EmptyState from '@/shared/ui/EmptyState'
import Skeleton from '@/shared/ui/Skeleton'

/**
 * 자금 조합 (S15P21D101-200)
 *
 * 필요 금액을 넣으면 그 금액을 채우는 상품 조합 몇 개를 서버가 추천한다.
 *
 * 금액을 주소(?amount=50000000)에 둔다. 새로고침해도 결과가 남고, 뒤로가기로 이전
 * 금액의 추천에 돌아갈 수 있다. 상권 분석과 같은 방식이다.
 *
 * 고른 조합은 주소에 두지 않는다. 서버로 가는 조건이 아니고, 조합 목록이 바뀌면
 * 인덱스가 다른 조합을 가리키게 되어 주소로 공유할 수 있는 값이 아니다.
 */
export function FundingPlanPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedIndex, setSelectedIndex] = useState(0)

  const rawAmount = Number(searchParams.get('amount'))
  const amount = Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : undefined

  const { data: combinations, isLoading, isError } = useFundingRecommend(amount)

  const handleSubmit = (won: number) => {
    setSearchParams({ amount: String(won) })
    // 금액이 바뀌면 다른 조합 목록이라 대표를 첫 번째로 되돌린다
    setSelectedIndex(0)
  }

  // 목록이 줄어든 뒤에도 예전 인덱스를 가리키지 않게 막는다
  const selected = combinations?.[selectedIndex] ?? combinations?.[0]

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-3.5">
      <h1 className="text-h1">자금 조합</h1>

      <FundingAmountForm amount={amount} onSubmit={handleSubmit} />

      {!amount && (
        <EmptyState
          title="필요한 금액을 알려주세요"
          description="그 금액을 채우는 가장 유리한 상품 조합을 찾아드려요. 무상 지원금을 먼저 채워 이자를 줄입니다."
        />
      )}

      {isLoading && <Skeleton height={220} className="rounded-md" />}

      {isError && (
        <EmptyState title="조합을 찾지 못했어요" description="금액을 바꿔서 다시 시도해보세요." />
      )}

      {combinations && combinations.length === 0 && (
        <EmptyState
          title="이 금액을 채울 조합이 없어요"
          description="금액을 낮추거나, 자격 판정 정보를 갱신하면 더 많은 상품이 잡힙니다."
        />
      )}

      {selected && amount && (
        <FundingCombinationCard
          combination={selected}
          order={selectedIndex + 1}
          targetAmount={amount}
        />
      )}

      {combinations && combinations.length > 1 && (
        <div className="grid gap-3.5 sm:grid-cols-2">
          {combinations.map((combination, index) =>
            // 대표로 올라간 조합은 위에 이미 크게 나와 있다
            index === selectedIndex ? null : (
              <FundingCombinationSummaryCard
                key={index}
                combination={combination}
                order={index + 1}
                onSelect={() => setSelectedIndex(index)}
              />
            ),
          )}
        </div>
      )}

      {combinations && combinations.length > 1 && (
        <FundingComparisonTable
          combinations={combinations}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
        />
      )}
    </div>
  )
}
