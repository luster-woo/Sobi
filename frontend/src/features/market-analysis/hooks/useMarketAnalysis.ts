import { useQuery } from '@tanstack/react-query'

import { getMarketAnalysis } from '@/features/market-analysis/api/market'
import type { MarketAnalysisParams } from '@/features/market-analysis/model/types'
import { queryKeys } from '@/shared/api/queryKeys'

/** 분기 단위로 갱신되는 통계라 한 번 받으면 오래 유효하다 */
const STALE_TIME_MS = 30 * 60 * 1000

/**
 * 상권 분석 조회.
 *
 * params 가 없으면(조건을 아직 입력하지 않았으면) 호출하지 않는다. 조건 입력 모달을
 * 닫기 전까지는 부를 대상이 없어서다.
 *
 * 재시도를 끈다. 실패의 대부분이 '존재하지 않는 행정동'(MARKET_001)인데, 같은 조건으로
 * 다시 물어도 같은 답이 온다. 세 번 더 부르는 동안 사용자는 로딩만 본다.
 */
export function useMarketAnalysis(params?: MarketAnalysisParams) {
  return useQuery({
    queryKey: queryKeys.market.analysis(params ?? {}),
    queryFn: () => {
      // enabled 가 막아주지만, 타입을 좁히려면 여기서 한 번 걸러야 한다
      if (!params) throw new Error('조건 없이 상권 분석을 호출했다')
      return getMarketAnalysis(params)
    },
    enabled: Boolean(params),
    staleTime: STALE_TIME_MS,
    retry: false,
  })
}
