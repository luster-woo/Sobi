import { toBusinessSummary } from '@/features/business/model/summary'
import type { BusinessMeResponse } from '@/features/business/model/types'
import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'

/**
 * 내 업체 요약 조회.
 *
 * 응답에 지역 필드가 없어 주소에서 잘라 사이드바 카드 모양으로 바꿔 돌려준다.
 *
 * 업체 등록을 아직 안 한 계정은 404 BUSINESS_004 가 온다. 에러가 아니라 '등록 전' 이라는
 * 정상적인 상태라서 여기서 삼키지 않고 그대로 던진다 — 판단은 호출하는 훅이 한다.
 */
export async function getBusinessSummary() {
  const { data } = await api.get<BusinessMeResponse>(endpoints.business.me)
  return toBusinessSummary(data)
}
