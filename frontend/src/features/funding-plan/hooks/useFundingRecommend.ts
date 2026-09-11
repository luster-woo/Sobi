import { useQuery } from '@tanstack/react-query'

import { getFundingRecommendations } from '@/features/funding-plan/api/funding'
import { queryKeys } from '@/shared/api/queryKeys'

/** 상품 금리·한도가 바뀌지 않는 한 같은 결과다. 화면을 보는 동안 다시 부를 이유가 없다 */
const STALE_TIME_MS = 10 * 60 * 1000

/**
 * 조합 추천.
 *
 * targetAmount 가 없으면(아직 금액을 입력하지 않았으면) 부르지 않는다. 금액이 바뀌면
 * 다른 추천이라 캐시 키가 갈리고, 같은 금액으로 다시 누르면 캐시에서 바로 나온다.
 */
export function useFundingRecommend(targetAmount?: number) {
  return useQuery({
    queryKey: queryKeys.funding.recommend(targetAmount ?? 0),
    queryFn: () => {
      if (!targetAmount) throw new Error('금액 없이 조합 추천을 호출했다')
      return getFundingRecommendations({ targetAmount })
    },
    enabled: Boolean(targetAmount),
    staleTime: STALE_TIME_MS,
  })
}