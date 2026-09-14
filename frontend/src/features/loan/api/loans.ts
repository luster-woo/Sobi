import type { LoanDetail, LoanListData, LoanListParams } from '@/features/loan/model/types'
import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'

/**
 * 대출 상품 목록 조회.
 *
 * 봉투는 `client.ts` 인터셉터가 벗긴다. 여기서는 알맹이 타입만 쓴다.
 * params 의 undefined 필드는 axios 가 쿼리에서 빼준다.
 */
export async function getLoans(params: LoanListParams) {
  const { data } = await api.get<LoanListData>(endpoints.loan.list, { params })
  return data
}

/** 대출 상품 상세. 모달에서 쓴다 */
export async function getLoanDetail(loanId: number) {
  const { data } = await api.get<LoanDetail>(endpoints.loan.detail(loanId))
  return data
}
