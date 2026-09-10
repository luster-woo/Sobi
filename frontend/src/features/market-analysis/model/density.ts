import type { NeighborMarket } from '@/features/market-analysis/model/types'
import type { BadgeVariant } from '@/shared/ui/Badge'

export type DensityLevel = 'high' | 'similar' | 'low'

/**
 * 지역 평균 대비 몇 배부터 '높다/낮다' 로 볼지.
 *
 * ±10% 로 잡았다. 이보다 좁히면 202곳 vs 210곳 처럼 사실상 같은 상권이 '높음' 이 되고,
 * 넓히면 868곳 vs 202곳(4.3배)이 '평균 수준' 에 묶인다.
 *
 * ⚠️ 기획에서 정해준 기준이 아니다. 확정되면 이 두 값만 바꾸면 배지와 문구가 같이 따라온다.
 */
const HIGH_RATIO = 1.1
const LOW_RATIO = 0.9

export const DENSITY_LABEL: Record<DensityLevel, string> = {
  high: '평균보다 높음',
  similar: '평균 수준',
  low: '평균보다 낮음',
}

/**
 * 색 기준은 "예비창업자에게 좋은 소식인가" 다.
 * 동종업종이 많다 = 경쟁이 심하다 = 조치가 필요하다 → warning
 * 적다 = 들어갈 틈이 있다 → success
 */
export const DENSITY_VARIANT: Record<DensityLevel, BadgeVariant> = {
  high: 'warning',
  similar: 'neutral',
  low: 'success',
}

export const DENSITY_MESSAGE: Record<DensityLevel, string> = {
  high: '경쟁 밀집도가 높은 상권이에요.',
  similar: '지역 평균과 비슷한 밀집도예요.',
  low: '경쟁이 상대적으로 적은 상권이에요.',
}

export function getDensityLevel(dong: number, districtAvg: number): DensityLevel {
  // 자치구 평균이 0 이면 비교 자체가 안 된다
  if (districtAvg <= 0) return 'similar'

  const ratio = dong / districtAvg
  if (ratio >= HIGH_RATIO) return 'high'
  if (ratio <= LOW_RATIO) return 'low'
  return 'similar'
}

/**
 * 조회한 동보다 동종업종이 적은 이웃 중 가장 적은 곳.
 *
 * 시안의 "인근 복현동은 동종업종이 11곳으로 밀집도가 낮습니다" 문구를 만드는 데 쓴다.
 * 서버가 문장을 주는 게 아니라 neighbors 배열에서 프론트가 뽑는다.
 *
 * neighbors 에는 조회한 동 자신도 들어 있어서 dongCode 로 걸러낸다. 자기보다 적은 곳이
 * 하나도 없으면(이 동이 제일 한산하면) null 을 주고, 화면은 그 문장을 생략한다.
 */
export function findLooserNeighbor(
  neighbors: NeighborMarket[],
  dongCode: string,
  dongStoreCount: number,
): NeighborMarket | null {
  const looser = neighbors.filter(
    (neighbor) => neighbor.dongCode !== dongCode && neighbor.storeCount < dongStoreCount,
  )
  if (looser.length === 0) return null

  return looser.reduce((min, neighbor) => (neighbor.storeCount < min.storeCount ? neighbor : min))
}
