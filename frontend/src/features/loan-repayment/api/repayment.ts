import {
  normalizeLoanProduct,
  normalizeRepaymentDetail,
} from '@/features/loan-repayment/model/normalize'
import type { RawLoanProduct, RawRepaymentDetail } from '@/features/loan-repayment/model/types'
import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'

/**
 * 내 대출 상품 목록.
 *
 * 조회인데 POST 다. 금융망 규격을 그대로 올린 것이라 본문이 비어 있어도 POST 로 보낸다.
 * axios 는 두 번째 인자를 본문으로 쓰므로 빈 객체를 넘긴다.
 */
export async function getLoanProducts() {
  const { data } = await api.post<{ loanProductList: RawLoanProduct[] }>(
    endpoints.repayment.list,
    {},
  )
  return data.loanProductList.map(normalizeLoanProduct)
}

/** 상환 내역 + 완납 비교 */
export async function getRepaymentDetail(accountNo: string) {
  const { data } = await api.post<RawRepaymentDetail>(endpoints.repayment.records, { accountNo })
  return normalizeRepaymentDetail(data)
}

/**
 * 일시납(완납). 되돌릴 수 없다 — 호출 즉시 출금 계좌에서 전액이 빠진다.
 * 반드시 확인 단계를 거친 뒤에만 부른다.
 */
export async function repayInFull(accountNo: string) {
  await api.post<null>(endpoints.repayment.loanBalanceInFull, { accountNo })
}
