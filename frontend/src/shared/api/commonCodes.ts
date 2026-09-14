import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { BusinessTree, RegionTree } from '@/shared/types/commonCode'

/** 업종 대/중/소 전체 트리 */
export async function getBusinessTree() {
  const { data } = await api.get<BusinessTree>(endpoints.common.businesses)
  return data
}

/** 서울 자치구 + 행정동 전체 트리 */
export async function getRegionTree() {
  const { data } = await api.get<RegionTree>(endpoints.common.regions)
  return data
}
