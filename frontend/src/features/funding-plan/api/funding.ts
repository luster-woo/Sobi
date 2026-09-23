import type {
  FundingBatchItem,
  FundingRecommendData,
  FundingRecommendParams,
} from '@/features/funding-plan/model/types'
import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'

/**
 * 조합 추천. 조회인데 POST 다 — 조건을 body 로 받는다.
 *
 * 응답을 통째로 돌려준다. recommendedCombinations 만 꺼내면 targetAmount 를 잃는데,
 * 초과 조달분을 계산하려면 "서버가 어떤 금액으로 계산했는지" 가 필요하다.
 *
 * 봉투(statusCode·data·error)는 client.ts 의 인터셉터가 벗긴다. 여기서 ApiResponse 로
 * 한 번 더 감싸면 두 번 벗기게 되어 undefined 가 된다.
 */
export async function getFundingRecommendations(params: FundingRecommendParams) {
  const { data } = await api.post<FundingRecommendData>(endpoints.funding.recommend, params)
  return data
}

/**
 * 고른 조합으로 신청 목록 생성.
 *
 * 응답이 비어 있다(ApiResponse<Void>). 만들어진 신청 id 를 돌려달라고 요청해 뒀지만
 * 그것에 기대지 않는다 — 안 넣고 고쳐도 화면이 깨지면 안 된다. 신청 목록 캐시를 비우고
 * 신청 현황으로 보내는 것으로 충분하다.
 *
 * 배분액(allocatedAmount)은 보내지 않는다. 서버가 금액을 제출 시점에만 받고 신청 생성
 * 단계에서는 저장할 곳이 없다.
 *
 * ⚠️ items 의 type 은 LOAN · SUPPORT 여야 한다. model/batch.ts 의 toBatchItems 를
 *    거쳐서 넘길 것.
 */
export async function applyFundingBatch(items: FundingBatchItem[]) {
  await api.post<null>(endpoints.funding.batch, { item: items })
}
