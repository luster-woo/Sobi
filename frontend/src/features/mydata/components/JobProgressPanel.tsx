import type { ReactNode } from 'react'

import ProgressBar from '@/shared/ui/ProgressBar'
import StepList, { type StepItem } from '@/shared/ui/StepList'

interface JobProgressPanelProps {
  steps: StepItem[]
  /** 0~100 */
  percent: number
  /** 낭독기가 읽을 문구. '무엇의' 진행률인지 밝힌다 */
  label: string
  /** 막대 위에 붙는 한 줄. 자격 판정 화면의 'N개 판정 완료' 가 여기 들어간다 */
  summary?: ReactNode
  /**
   * 막대를 목록 위에 둘지.
   *
   * 수집 화면은 단계를 먼저 읽히고 막대로 마무리하고, 판정 화면은 숫자와 막대를 먼저
   * 보여준 뒤 단계를 깐다. 시안이 그렇게 갈려 있다.
   */
  barFirst?: boolean
}

/**
 * 진행률 패널. 단계 목록과 막대를 한 상자에 담는다.
 *
 * **값을 만들지 않는다.** 진행률이 어디서 오는지(시간 추정이든 서버 폴링이든) 모르고,
 * 받은 것을 그리기만 한다. 서버가 진행 상태를 주기 시작하면 이 컴포넌트는 그대로 두고
 * 부르는 쪽의 훅만 갈아끼우면 된다.
 */
export default function JobProgressPanel({
  steps,
  percent,
  label,
  summary,
  barFirst = false,
}: JobProgressPanelProps) {
  const bar = (
    <div
      className={
        barFirst
          ? 'border-border-subtle border-b px-4 py-3.5'
          : 'border-border-subtle border-t px-4 py-3.5'
      }
    >
      {summary && <div className="text-body2 text-text mb-2.5">{summary}</div>}
      <ProgressBar value={percent} showValue label={label} />
    </div>
  )

  return (
    <div className="border-border bg-surface w-full overflow-hidden rounded-md border">
      {barFirst && bar}
      <StepList steps={steps} />
      {!barFirst && bar}
    </div>
  )
}
