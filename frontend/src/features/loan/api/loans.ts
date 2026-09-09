import type { LoanListData, LoanListParams } from '@/features/loan/model/types'
import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { ApiResponse } from '@/shared/types'

/**
 * 대출 상품 목록 조회.
 *
 * 봉투를 여기서 벗긴다. 화면과 훅이 `data.data.loans` 를 몰라도 되게 하려는 것이고,
 * client.ts 인터셉터로 옮기기로 정해지면 이 함수만 고치면 된다.
 *
 * params 의 undefined 필드는 axios 가 쿼리에서 빼준다. 그래서 값이 없는 필터를
 * `bankName=` 처럼 빈 값으로 보내는 일이 없다.
 */
export async function getLoans(params: LoanListParams) {
  const { data } = await api.get<ApiResponse<LoanListData>>(endpoints.loan.list, { params })
  return data.data
}