import { useQuery } from '@tanstack/react-query'

import { getBusinessTree, getRegionTree } from '@/shared/api/commonCodes'
import { queryKeys } from '@/shared/api/queryKeys'

/**
 * 업종·지역 목록은 분기마다 바뀔까 말까 한 정적 데이터다. 앱을 켜 있는 동안 다시
 * 받을 이유가 없어 stale 로 만들지 않는다.
 *
 * 상권 분석 조건 모달과 대시보드의 창업 조건 패널이 같은 캐시를 공유한다.
 */
const STATIC_OPTIONS = {
  staleTime: Infinity,
  gcTime: Infinity,
} as const

export function useBusinessTree() {
  return useQuery({
    queryKey: queryKeys.market.businesses,
    queryFn: getBusinessTree,
    ...STATIC_OPTIONS,
  })
}

export function useRegionTree() {
  return useQuery({
    queryKey: queryKeys.market.regions,
    queryFn: getRegionTree,
    ...STATIC_OPTIONS,
  })
}
