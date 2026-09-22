import { useEffect, useState } from 'react'

import type { StepItem } from '@/shared/ui/StepList'
import {
  estimatePercent,
  finishPercent,
  type JobStepDef,
  toStepItems,
} from '@/shared/utils/estimatedProgress'

const TICK_MS = 100

/** 응답이 온 뒤 남은 구간을 채우는 최소 시간. 이보다 짧으면 막대가 튄 것처럼 보인다 */
const FINISH_MS = 1200

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

/** 응답이 온 순간. 그때의 경과 시간과 막대 위치에서 100 까지 이어 채운다 */
interface SettleMark {
  atMs: number
  fromPercent: number
  durationMs: number
}

/**
 * 시간으로 미는 진행률. 계산 근거는 `shared/utils/estimatedProgress.ts` 주석 참고.
 *
 * `settled` 를 받는 것이 핵심이다. 이 값이 false 인 동안에는 100% 에 닿지 않으므로,
 * 응답이 늦어도 막대가 멈춰 보이지 않는다.
 *
 * 응답이 오면 그 순간의 위치에서 `FINISH_MS`(또는 `minMs` 까지 남은 시간) 동안 이어
 * 채운다. 예전에는 시작 시각 기준으로 계산해서, `minMs` 가 지난 뒤 응답이 오면
 * 16% → 100% 처럼 한 번에 뛰었다.
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
  const [mark, setMark] = useState<SettleMark | null>(null)

  useEffect(() => {
    const startedAt = Date.now()
    const timer = window.setInterval(() => setElapsed(Date.now() - startedAt), TICK_MS)

    return () => window.clearInterval(timer)
  }, [])

  const waitingPercent = estimatePercent({ elapsedMs: elapsed, expectedMs })

  // 응답이 온 렌더에서 한 번 기록한다. 이펙트로 미루면 한 프레임 동안 옛 계산이 보인다
  if (settled && mark === null) {
    setMark({
      atMs: elapsed,
      fromPercent: waitingPercent,
      durationMs: Math.max(FINISH_MS, minMs - elapsed),
    })
  }
  if (!settled && mark !== null) setMark(null)

  const activeMark = settled ? mark : null
  const percent = activeMark
    ? finishPercent({
        fromPercent: activeMark.fromPercent,
        sinceMs: elapsed - activeMark.atMs,
        durationMs: activeMark.durationMs,
      })
    : waitingPercent

  return {
    percent,
    steps: toStepItems(defs, percent),
    done: activeMark !== null && elapsed - activeMark.atMs >= activeMark.durationMs,
  }
}
