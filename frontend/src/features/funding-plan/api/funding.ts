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
 * ⚠️ 아직 화면에서 부르지 않는다. 서버의 FundingService.application() 이 빈 반복문이라
 *    200 만 오고 application 행이 생기지 않는다. 게다가 body 가 { type, id } 뿐이라
 *    조합이 계산한 배분액(allocatedAmount)이 저장되지 않는다. 둘 다 해결돼야 화면의
 *    '이 조합으로 진행' 버튼을 열 수 있다.
 */
export async function applyFundingBatch(items: FundingBatchItem[]) {
  await api.post<null>(endpoints.funding.batch, { item: items })
}
