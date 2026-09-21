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
export function useFundingRecommend(targetAmount?: number, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.funding.recommend(targetAmount ?? 0),
    queryFn: () => {
      if (!targetAmount) throw new Error('금액 없이 조합 추천을 호출했다')
      return getFundingRecommendations({ targetAmount })
    },
    /*
     * 부르는 쪽이 막을 수 있어야 한다. 예비창업자는 사업자 정보가 없어 서버가 404
     * (BUSINESS_004) 를 주는데, 어차피 실패할 요청을 보내고 에러 화면을 그리는 것보다
     * 아예 안 보내고 이유를 띄우는 편이 낫다.
     */
    enabled: Boolean(targetAmount) && (options.enabled ?? true),
    staleTime: STALE_TIME_MS,
  })
}
