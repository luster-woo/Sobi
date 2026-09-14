import type { BusinessSummary } from '@/features/business/model/types'
import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'

/**
 * 내 업체 요약 조회.
 *
 * 업체 등록을 아직 안 한 계정은 404 가 온다. 에러가 아니라 '등록 전' 이라는 정상적인
 * 상태라서 여기서 삼키지 않고 그대로 던진다 — 판단은 호출하는 훅이 한다.
 */
export async function getBusinessSummary() {
  const { data } = await api.get<BusinessSummary>(endpoints.business.me)
  return data
}
