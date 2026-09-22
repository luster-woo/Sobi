import { keepPreviousData, useQuery } from '@tanstack/react-query'

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
 *
 * 조건이 바뀌는 동안 이전 결과를 그대로 둔다(keepPreviousData). 지도에서 옆 동을
 * 누르면 쿼리 키가 바뀌는데, 기본 동작대로 data 가 비면 화면의 패널이 전부 사라져
 * 페이지 높이가 스켈레톤 두 줄로 무너진다. 그러면 스크롤이 갈 곳을 잃고 맨 위로
 * 튕기고, 새 데이터가 와서 다시 길어져도 위치는 0 에 남는다 — 지도를 보려고
 * 내려둔 스크롤이 누를 때마다 풀린다.
 *
 * 이전 결과를 두면 높이가 유지돼 스크롤이 제자리에 있고, 지도도 사라졌다 나타나지
 * 않는다. 바뀌는 중이라는 것은 화면에서 isPlaceholderData 로 흐리게 알린다.
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
    placeholderData: keepPreviousData,
  })
}
