import { useEffect, useState } from 'react'

import type { StepItem, StepStatus } from '@/shared/ui/StepList'

const TICK_MS = 100

export interface JobStepDef {
  key: string
  label: string
  /** 단계가 끝났을 때 오른쪽에 붙일 문구. 없으면 StepList 기본값 */
  doneNote?: string
}

export interface JobProgress {
  percent: number
  steps: StepItem[]
  done: boolean
}

/**
 * ⚠️ **임시 구현이다.** 서버 폴링이 생기면 이 훅을 통째로 지운다.
 *
 * `POST /mydata/link` 가 지금은 동기 1회 호출이라 진행 상태를 받을 방법이 없다.
 * 비동기 전환(`jobId` + `GET /mydata/link/{jobId}`)을 백엔드에 요청해둔 상태이고,
 * 그때까지 화면을 확인할 수 있게 시간 기반으로 진행률을 만든다.
 *
 * 반환 모양은 요청한 폴링 응답과 같다 — 나중에 이 훅 자리에 `useQuery` 를 넣으면
 * 화면 코드는 안 고쳐도 된다.
 *
 * 각 단계는 전체 시간을 균등하게 나눠 갖는다. 실제 소요 시간은 단계마다 다르지만
 * 서버가 알려주기 전에는 알 수 없다.
 */
export function useJobProgress(defs: JobStepDef[], durationMs: number): JobProgress {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const startedAt = Date.now()

    const timer = window.setInterval(() => {
      const next = Date.now() - startedAt
      setElapsed(next)

      if (next >= durationMs) window.clearInterval(timer)
    }, TICK_MS)

    return () => window.clearInterval(timer)
  }, [durationMs])

  const percent = Math.min(100, (elapsed / durationMs) * 100)
  const perStep = 100 / defs.length

  const steps: StepItem[] = defs.map((def, index) => {
    const start = index * perStep
    const end = start + perStep

    let status: StepStatus = 'PENDING'
    if (percent >= end) status = 'DONE'
    else if (percent > start) status = 'IN_PROGRESS'

    return {
      key: def.key,
      label: def.label,
      status,
      note: status === 'DONE' ? (def.doneNote ?? null) : null,
    }
  })

  return { percent, steps, done: percent >= 100 }
}
