import { useEffect, useState } from 'react'

import type { StepItem } from '@/shared/ui/StepList'
import { estimatePercent, type JobStepDef, toStepItems } from '@/shared/utils/estimatedProgress'

const TICK_MS = 100

interface EstimatedProgressOptions {
  defs: JobStepDef[]
  /** 예상 소요 시간 */
  expectedMs: number
  /** 응답이 와도 이 시간은 화면을 유지한다 */
  minMs: number
  /** 기다리는 일이 끝났는가. 기다릴 것이 없는 화면은 true 로 둔다 */
  settled: boolean
}

export interface EstimatedProgress {
  percent: number
  steps: StepItem[]
  /** 다음 화면으로 넘어가도 되는 시점 */
  done: boolean
}

/**
 * 시간으로 미는 진행률. 계산 근거는 `shared/utils/estimatedProgress.ts` 주석 참고.
 *
 * `settled` 를 받는 것이 핵심이다. 이 값이 false 인 동안에는 100% 에 닿지 않으므로,
 * 응답이 늦어도 막대가 멈춰 보이지 않는다.
 *
 * 처음부터 `settled: true` 를 주면 `minMs` 에 걸쳐 0 에서 100 까지 채우는 단순한
 * 타이머가 된다 — 기다릴 것이 없는데 단계를 보여주는 화면(자격 판정)이 그렇게 쓴다.
 */
export function useEstimatedProgress({
  defs,
  expectedMs,
  minMs,
  settled,
}: EstimatedProgressOptions): EstimatedProgress {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const startedAt = Date.now()
    const timer = window.setInterval(() => setElapsed(Date.now() - startedAt), TICK_MS)

    return () => window.clearInterval(timer)
  }, [])

  const percent = estimatePercent({ elapsedMs: elapsed, expectedMs, minMs, settled })

  return {
    percent,
    steps: toStepItems(defs, percent),
    done: settled && elapsed >= minMs,
  }
}
