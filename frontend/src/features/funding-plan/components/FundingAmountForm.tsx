import { useState } from 'react'

import Button from '@/shared/ui/Button'
import Input from '@/shared/ui/Input'
import Panel from '@/shared/ui/Panel'

interface FundingAmountFormProps {
  /** 현재 주소에 있는 금액(원). 없으면 undefined */
  amount?: number
  /** 조합 찾기. 원 단위로 넘긴다 */
  onSubmit: (won: number) => void
}

const TEN_THOUSAND = 10_000
/** 이보다 적은 금액은 조합할 상품이 없다 */
const MIN_MAN = 100

/**
 * 필요 금액 입력.
 *
 * 입력은 '만 원' 단위로 받는다. 5,000만 원을 쓰려고 0 을 일곱 개 누르게 하면 오타가
 * 나고, 자기가 무엇을 입력했는지 읽기도 어렵다. 서버로는 원 단위로 환산해 보낸다.
 *
 * 값을 여기서 들고 있다가 제출할 때만 바깥으로 넘긴다. 타이핑하는 동안 주소가 바뀌면
 * 글자마다 조회가 나가고 뒤로가기 기록이 쌓인다.
 */
export default function FundingAmountForm({ amount, onSubmit }: FundingAmountFormProps) {
  const [man, setMan] = useState(amount ? String(Math.round(amount / TEN_THOUSAND)) : '')

  const parsed = Number(man)
  const canSubmit = Number.isFinite(parsed) && parsed >= MIN_MAN

  return (
    <Panel>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (canSubmit) onSubmit(parsed * TEN_THOUSAND)
        }}
        className="flex flex-wrap items-end gap-3 p-4"
      >
        <Input
          label="필요 금액"
          type="number"
          inputMode="numeric"
          min={MIN_MAN}
          step={100}
          placeholder="5000"
          rightSlot="만 원"
          value={man}
          onChange={(event) => setMan(event.target.value)}
          className="w-full sm:w-[220px]"
        />

        {/* 라벨이 있는 Input 과 높이를 맞추려고 아래로 정렬한다 */}
        <Button type="submit" disabled={!canSubmit}>
          조합 찾기
        </Button>
      </form>
    </Panel>
  )
}