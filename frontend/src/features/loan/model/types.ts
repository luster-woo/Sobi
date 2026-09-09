import type { ProductStatus } from '@/shared/constants/productStatus'
import type { PageMeta } from '@/shared/types'

/**
 * 대출 목록의 한 행.
 *
 * shared/types/loan.ts 의 Loan 과 다르다. 목록 응답에는 요약 필드만 오고
 * (minLoanBalance · period · ratingName 없음), 대신 서버가 계산한 status 와
 * isBookmark 가 붙는다 — loan 테이블에는 없는 값이라 조인 결과다.
 */
export interface LoanListItem {
  loanId: number
  /** ⚠️ 상품명이다. 컬럼명이 account_name 이라 계좌명으로 읽히기 쉽다 */
  accountName: string
  bankName: string
  /** 연 이율(%) */
  interestRate: number
  /** 한도(원) */
  maxLoanBalance: number
  status: ProductStatus
  isBookmark: boolean
}

export interface LoanListData {
  loans: LoanListItem[]
  page: PageMeta
}

/** 목록 조회 쿼리. undefined 인 필터는 axios 가 알아서 빼고 보낸다 */
export interface LoanListParams {
  /** 0-base. 화면의 1-base 를 toServerPage 로 변환해서 넣는다 */
  page: number
  size: number
  /** 상품명·기관명 부분 일치 검색 */
  keyword?: string
  isPossible?: boolean
  bankName?: string
  isBookmark?: boolean
  sort?: string
}
