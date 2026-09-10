import type { BusinessMix } from '@/features/market-analysis/model/types'

export interface BusinessMixRest {
  storeCount: number
  sharePercent: number
}

/**
 * 목록에 없는 나머지 업종을 합친 값.
 *
 * 서버가 상위 몇 개(mixLimit)만 주므로 sharePercent 합이 100 이 안 된다. 전체
 * 점포 수(totalStoreCount)에서 항목들을 빼면 나머지가 나온다.
 *
 * 서버가 '기타' 항목을 따로 주지 않는 이유는 mixLimit 을 몇으로 주느냐에 따라
 * 기타의 크기가 달라지기 때문이다. 그래서 받은 쪽에서 계산한다.
 */
export function getBusinessMixRest(businessMix: BusinessMix): BusinessMixRest | null {
  const listedStores = businessMix.items.reduce((sum, item) => sum + item.storeCount, 0)
  const listedShare = businessMix.items.reduce((sum, item) => sum + item.sharePercent, 0)

  const storeCount = businessMix.totalStoreCount - listedStores
  // 항목이 전체를 덮었으면 기타 줄을 그리지 않는다
  if (storeCount <= 0) return null

  return {
    storeCount,
    // 소수 첫째 자리까지 반올림. 항목들의 sharePercent 도 그 자리까지 온다
    sharePercent: Math.round((100 - listedShare) * 10) / 10,
  }
}
