import type { BusinessTree, RegionTree } from '@/features/market-analysis/model/conditionTypes'
import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { ApiResponse } from '@/shared/types'

/** 업종 대/중/소 전체 트리 */
export async function getBusinessTree() {
  const { data } = await api.get<ApiResponse<BusinessTree>>(endpoints.common.businesses)
  return data.data
}

/** 서울 자치구 + 행정동 전체 트리 */
export async function getRegionTree() {
  const { data } = await api.get<ApiResponse<RegionTree>>(endpoints.common.regions)
  return data.data
}
