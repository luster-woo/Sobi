import { formatBigWonText } from '@/features/market-analysis/model/format'
import type { NeighborMarket } from '@/features/market-analysis/model/types'

/**
 * 지도에 칠할 지표.
 *
 * 네 개로 묶은 기준은 "예비창업자가 자리를 고를 때 순서대로 묻는 것" 이다.
 *   가게가 몇이나 있나 → 사람은 얼마나 지나가나 → 얼마나 파나 → 얼마나 망하나
 *
 * 폐업률만 방향이 반대다. 나머지는 클수록 좋은데 이건 클수록 나쁘다. 색은 크기만
 * 말하고 좋고 나쁨은 말하지 않기로 했다 — 같은 초록 농도를 쓰되, 값이 서울 평균보다
 * 높은 동에는 화면에서 따로 표시를 붙인다. 초록과 빨강을 섞으면 네 지표가 서로 다른
 * 색 규칙을 갖게 되어 범례 하나로 설명할 수 없다.
 */
export const HEAT_METRIC = {
  STORE: 'STORE',
  TRAFFIC: 'TRAFFIC',
  REVENUE: 'REVENUE',
  CLOSE: 'CLOSE',
} as const

export type HeatMetric = (typeof HEAT_METRIC)[keyof typeof HEAT_METRIC]

interface MetricSpec {
  label: string
  /** 값이 없을 수 있다. 점포가 0 곳인 동은 비율·점포당 지표가 전부 null 이다 */
  pick: (neighbor: NeighborMarket) => number | null
  /** 지도 위 이름표 아래에 들어갈 짧은 표기 */
  format: (value: number) => string
}

export const HEAT_METRIC_SPEC: Record<HeatMetric, MetricSpec> = {
  STORE: {
    label: '점포 수',
    pick: (neighbor) => neighbor.storeCount,
    format: (value) => `${value.toLocaleString('ko-KR')}곳`,
  },
  TRAFFIC: {
    label: '유동인구',
    pick: (neighbor) => neighbor.dailyFootTraffic,
    // 지도 위에서는 자리가 좁다. 19만으로 줄여도 순위를 읽는 데는 지장이 없다
    format: (value) => `${Math.round(value / 10_000).toLocaleString('ko-KR')}만명`,
  },
  REVENUE: {
    label: '점포당 매출',
    pick: (neighbor) => neighbor.revenuePerStoreMonthly,
    format: (value) => formatBigWonText(value),
  },
  CLOSE: {
    label: '폐업률',
    pick: (neighbor) => neighbor.annualCloseRate,
    format: (value) => `${value.toFixed(1)}%`,
  },
}

/** 색 단계 수. index.css 의 --color-heat-1 ~ 5 와 개수가 같아야 한다 */
export const HEAT_STEPS = 5

/**
 * 값을 색 단계(0~4)로.
 *
 * 최솟값과 최댓값 사이를 다섯 칸으로 나눈다. 서울 전체 기준이 아니라 **지금 화면에
 * 올라온 동들 사이의 상대 크기**다. 서울 기준으로 잡으면 마포구 여덟 개가 전부 같은
 * 칸에 들어가 지도가 한 색이 된다.
 *
 * 모든 값이 같으면(동이 하나뿐이거나 값이 전부 같으면) 가운데 칸으로 둔다. 그때
 * 0/(max-min) 은 0으로 나누기가 된다.
 */
export function toHeatStep(value: number, values: readonly number[]): number {
  const min = Math.min(...values)
  const max = Math.max(...values)

  if (max === min) return Math.floor(HEAT_STEPS / 2)

  // 최댓값이 정확히 HEAT_STEPS 가 되어 배열을 넘어가므로 마지막 칸으로 눌러준다
  return Math.min(HEAT_STEPS - 1, Math.floor(((value - min) / (max - min)) * HEAT_STEPS))
}

/**
 * 단계별 Tailwind 클래스.
 *
 * 문자열을 조립하지 않고 통째로 적는다(`fill-heat-${step}` 금지). Tailwind 는 소스를
 * 글자 그대로 훑어서 클래스를 만들기 때문에, 조립한 이름은 빌드 결과에 안 들어간다.
 */
export const HEAT_FILL = ['fill-heat-1', 'fill-heat-2', 'fill-heat-3', 'fill-heat-4', 'fill-heat-5']

/**
 * 그 칸 위에 올릴 글자 색.
 *
 * 진한 칸(3·4)에 어두운 글자를 쓰면 안 읽힌다. 경계를 3 으로 둔 건 heat-4 부터
 * 배경이 흰 글자를 받칠 만큼 어두워지기 때문이다.
 */
export function heatTextClass(step: number | null): string {
  return step !== null && step >= 3 ? 'fill-text-inverse' : 'fill-text'
}

/**
 * 이름표 둘레 테두리 색.
 *
 * 좁은 동은 이름이 옆 칸으로 넘어간다. 글자와 같은 계열을 두르면 넘어간 자리에서
 * 배경에 묻으므로, 글자와 반대되는 색으로 둘러 어느 칸 위에서든 분리되게 한다.
 */
export function heatHaloClass(step: number | null): string {
  return step !== null && step >= 3 ? 'stroke-text' : 'stroke-surface'
}
