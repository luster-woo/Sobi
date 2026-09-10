import type { MarketAnalysis, MarketAnalysisParams } from '@/features/market-analysis/model/types'
import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { ApiResponse } from '@/shared/types'

/**
 * 상권 분석 조회.
 *
 * 봉투는 여기서 벗긴다. 화면과 훅이 `data.data.summary` 를 몰라도 되게 하는 것이고,
 * client.ts 인터셉터로 옮기기로 정해지면 이 함수만 고치면 된다.
 */
export async function getMarketAnalysis(params: MarketAnalysisParams) {
  const { data } = await api.get<ApiResponse<MarketAnalysis>>(endpoints.common.market, { params })
  return data.data
}
