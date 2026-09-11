import type {
  FundingBatchItem,
  FundingRecommendData,
  FundingRecommendParams,
} from '@/features/funding-plan/model/types'
import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { ApiResponse } from '@/shared/types'

/** 조합 추천. 조회인데 POST 다 — 조건을 body 로 받는다 */
export async function getFundingRecommendations(params: FundingRecommendParams) {
  const { data } = await api.post<ApiResponse<FundingRecommendData>>(
    endpoints.funding.recommend,
    params,
  )
  return data.data.recommendedCombinations
}

/**
 * 고른 조합으로 신청 목록 생성.
 *
 * ⚠️ 아직 화면에서 부르지 않는다. 서버가 application 테이블에 행을 만드는데 그 테이블에
 *    support_program_id 가 없어서 지원사업 항목을 저장할 수 없다. 조합에는 지원사업이
 *    거의 항상 들어가므로 절반만 저장되는 상태다. 컬럼이 추가되면 화면의
 *    '이 조합으로 진행' 버튼을 열면 된다.
 */
export async function applyFundingBatch(items: FundingBatchItem[]) {
  await api.post<ApiResponse<null>>(endpoints.funding.batch, { item: items })
}