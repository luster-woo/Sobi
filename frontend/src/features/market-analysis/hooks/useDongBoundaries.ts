import { useQuery } from '@tanstack/react-query'

import { getDongBoundaries } from '@/features/market-analysis/api/boundary'
import { queryKeys } from '@/shared/api/queryKeys'

/**
 * 행정동 경계.
 *
 * 빌드에 같이 실려 나가는 정적 파일이라 배포 전에는 절대 바뀌지 않는다. 그래서
 * staleTime 을 무한으로 두고, 화면을 오갈 때 다시 받지 않는다.
 *
 * 재시도도 끈다. 파일이 없다면 배포가 잘못된 것이라 세 번 더 불러도 결과가 같다.
 * 실패하면 지도만 빠지고 나머지 패널은 그대로 보여야 해서, 이 훅의 에러는 화면에서
 * 토스트를 띄우지 않고 조용히 삼킨다.
 */
export function useDongBoundaries() {
  return useQuery({
    queryKey: queryKeys.market.boundaries,
    queryFn: getDongBoundaries,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  })
}
