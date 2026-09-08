import type { ID, ISODateTime } from '@/types/common'

/**
 * 대출 상품 도메인
 * loan / loan_document / suggest_loan(업체별 추천 대출)
 */

/** loan — 대출 상품 */
export interface Loan {
  id: ID
  /** 상품명 (ERD 컬럼명 account_name) */
  accountName: string
  bankName: string
  /** 기본 금리 (%) */
  interestRate: number
  /** 최소 대출 금액 (원) */
  minLoanBalance: number
  /** 최대 대출 금액 (원) */
  maxLoanBalance: number
  /** 대출 기간 (개월) */
  period: number
  description: string | null
  /** 최소 가입 가능 신용등급명 (VARCHAR(3), 예: 'BB') */
  ratingName: string
  /** 실제 창업 시작 여부를 조건으로 요구하는지 */
  isStart: boolean
  /**
   * 근로자 관련 조건 유무.
   * ERD 상 컬럼명은 employee_num 이지만 타입은 BOOLEAN 입니다 (개수가 아님).
   */
  employeeNum: boolean
  /** 가입에 필요한 최소 업력 (년) */
  firmAge: number
}

/** loan_document — 대출 필요 서류 */
export interface LoanDocument {
  id: ID
  loanId: ID
  docName: string
}

/** suggest_loan — 업체별 추천 대출 상품 */
export interface SuggestLoan {
  businessId: ID
  loanId: ID
  createdAt: ISODateTime
}

/** 상세 화면용 — 상품 + 필요 서류 */
export interface LoanDetail extends Loan {
  documents: LoanDocument[]
}
