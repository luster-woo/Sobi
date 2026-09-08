import type { ID, ISODateTime } from '@/shared/types/common'

/**
 * 대출 상품. is_start·employee_num·firm_age·rating_name 이 가입 자격 조건이고,
 * 서버가 업체 정보와 맞춰본 결과가 `SuggestLoan` 이다.
 */
export interface Loan {
  id: ID
  /** ⚠️ 상품명이다. ERD 컬럼명이 account_name 이라 계좌명으로 읽히기 쉽다 */
  accountName: string
  bankName: string
  /** 기본 금리(%) */
  interestRate: number
  minLoanBalance: number
  maxLoanBalance: number
  /** 개월 */
  period: number
  description: string | null
  /** 가입 가능한 최소 신용등급명. `User.creditRating` 과 비교하는 값 */
  ratingName: string
  /** 실제 창업을 시작한 상태여야 가입 가능한지 */
  isStart: boolean
  /**
   * ⚠️ 인원수가 아니라 **근로자 관련 조건이 있는지** 다. ERD 상 BOOLEAN 이다.
   *    이름만 보고 number 로 쓰면 안 된다.
   */
  employeeNum: boolean
  /** 요구하는 최소 업력(년) */
  firmAge: number
}

export interface LoanDocument {
  id: ID
  loanId: ID
  docName: string
}

/** 업체별 추천 대출. 서버 배치가 채우는 매핑 테이블이라 PK 없이 두 FK 조합이다 */
export interface SuggestLoan {
  businessId: ID
  loanId: ID
  createdAt: ISODateTime
}

export interface LoanDetail extends Loan {
  documents: LoanDocument[]
}
