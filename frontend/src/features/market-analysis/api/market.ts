import type { MarketAnalysis, MarketAnalysisParams } from '@/features/market-analysis/model/types'
import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'

/** 상권 분석 조회. 봉투는 `client.ts` 인터셉터가 벗긴다 */
export async function getMarketAnalysis(params: MarketAnalysisParams) {
  const { data } = await api.get<MarketAnalysis>(endpoints.common.market, { params })
  return data
}
