import type { StepItem, StepStatus } from '@/shared/ui/StepList'

/**
 * 오래 걸리는 작업의 진행률 — **추정값이다.**
 *
 * 서버가 진행 상태를 주지 않는 작업들이 있다. 마이데이터 연동(15~40초)도, 서류 초안
 * 생성(최대 300초)도 결과 하나만 돌려주고 그 사이 어디까지 했는지 알 경로가 없다.
 * 알려면 서버가 상태를 기록하고 그걸 읽는 엔드포인트가 있어야 하는데 둘 다 백엔드
 * 작업이라, 지금은 시간으로 민다.
 *
 * 그래서 두 가지를 지킨다.
 *   - **100% 에 먼저 닿지 않는다.** 응답이 오기 전에 막대가 차면 30초를 100% 에서
 *     멈춰 있게 되고, 멈춘 막대는 고장으로 읽힌다.
 *   - **단계별 완료 문구를 지어내지 않는다.** '2개 기관 완료' 같은 값은 서버만 안다.
 */

/** 응답 전에는 여기까지만 찬다. 남은 5% 가 '아직 안 끝났다' 는 표시다 */
const CAP_PERCENT = 95

interface EstimateInput {
  /** 시작부터 지난 시간 */
  elapsedMs: number
  /** 예상 소요 시간. 이 시점에 CAP 의 86% 쯤 찬다 */
  expectedMs: number
}

/**
 * 응답 전 진행률(0~CAP).
 *
 * 지수적으로 `CAP_PERCENT` 에 수렴한다 — 늦어질수록 느려지지만 멈추지는 않는다.
 * 응답 뒤는 `finishPercent` 가 맡는다.
 */
export function estimatePercent({ elapsedMs, expectedMs }: EstimateInput): number {
  /*
   * 시상수를 예상 시간의 절반으로 둔다. 예상 시점에 1 - e^-2 = 86% 가 차고,
   * 두 배로 늦어져도 98% 라 아직 움직이는 것으로 보인다.
   */
  const tau = expectedMs / 2

  return CAP_PERCENT * (1 - Math.exp(-elapsedMs / tau))
}

interface FinishInput {
  /** 응답이 온 순간의 막대 위치 */
  fromPercent: number
  /** 응답이 온 뒤 지난 시간 */
  sinceMs: number
  /** 100 까지 채우는 데 쓰는 시간 */
  durationMs: number
}

/**
 * 응답 뒤 진행률. 응답이 온 위치에서 100 까지 일정하게 채운다.
 *
 * 값은 **뒤로 가지 않고 튀지도 않는다.** 응답 전 계산에서 이어받아 출발한다.
 */
export function finishPercent({ fromPercent, sinceMs, durationMs }: FinishInput): number {
  const progress = Math.min(1, Math.max(0, sinceMs) / durationMs)

  return fromPercent + (100 - fromPercent) * progress
}

export interface JobStepDef {
  key: string
  label: string
}

/**
 * 진행률을 단계 상태로 나눈다. 단계마다 구간을 똑같이 갖는다 —
 * 실제 소요는 단계마다 다르겠지만 서버가 알려주기 전에는 알 수 없다.
 */
export function toStepItems(defs: JobStepDef[], percent: number): StepItem[] {
  const perStep = 100 / defs.length

  return defs.map((def, index) => {
    const start = index * perStep
    const end = start + perStep

    let status: StepStatus = 'PENDING'
    if (percent >= end) status = 'DONE'
    else if (percent > start) status = 'IN_PROGRESS'

    return { key: def.key, label: def.label, status }
  })
}
