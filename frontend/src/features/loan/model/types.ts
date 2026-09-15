import type { ProductStatus } from '@/shared/constants/productStatus'

/**
 * 대출 목록의 한 행.
 *
 * shared/types/loan.ts 의 Loan 과 다르다. 목록 응답에는 요약 필드만 오고
 * (minLoanBalance · period · ratingName 없음), 대신 서버가 계산한 status 와
 * bookmarked 가 붙는다 — loan 테이블에는 없는 값이라 조인 결과다.
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
  bookmarked: boolean
}

/**
 * 정렬 기준. 서버 enum(LoanSortType)을 그대로 보낸다.
 *
 * 방향이 값에 박혀 있다 — 금리는 낮은 순, 한도는 높은 순. 대출을 고를 때 금리가
 * 높은 순서나 한도가 낮은 순서로 볼 이유가 없어서 서버가 아예 막아 둔 것이다.
 */
export const LOAN_SORT = {
  INTEREST_RATE: 'INTEREST_RATE',
  MAX_BALANCE: 'MAX_BALANCE',
} as const

export type LoanSort = (typeof LOAN_SORT)[keyof typeof LOAN_SORT]

/**
 * 목록 응답.
 *
 * 페이지네이션이 없다. 사용자마다 판정이 달라서 서버가 DB 에서 자르지 못하고 전체를
 * 판정한 뒤 메모리에서 거르기 때문이다. 상품 수가 수십 개 수준이라 한 번에 내려준다.
 *
 * totalCount 는 **필터를 적용하기 전** 전체 기준이다. 걸러진 개수는 loans.length 로
 * 센다 — 서버가 검색어·은행·판정·즐겨찾기를 모두 적용한 결과라 어떤 필터를 걸어도
 * 맞는 값이 나온다. 둘을 나란히 두면 "23개 중 7개" 가 된다.
 */
export interface LoanListData {
  totalCount: number
  /**
   * 상태별 상품 수. 7개 키가 항상 다 오고 해당 없는 상태는 0 이다.
   *
   * 지금 화면에서는 쓰지 않는다. 필터 선택지에 개수를 붙여 봤는데, 이 값도 필터 전
   * 기준이라 은행을 좁혀도 숫자가 그대로여서 오히려 헷갈렸다. 서버가 주는 값이라
   * 타입에는 남겨 둔다 — 상태별 분포를 보여줄 자리가 생기면 그때 쓴다.
   */
  statusCounts: Record<ProductStatus, number>
  loans: LoanListItem[]
}

/** 목록 조회 쿼리. undefined 인 필터는 axios 가 알아서 빼고 보낸다 */
export interface LoanListParams {
  /** 상품명·은행명 부분 일치 검색 */
  keyword?: string
  /** 판정 결과 + 내 신청 상태를 합친 값 */
  status?: ProductStatus
  bankName?: string
  /** true 일 때만 거른다. false 를 보내도 서버는 필터하지 않는다 */
  bookmarked?: boolean
  sort?: LoanSort
}

/**
 * 대출 상품 상세.
 *
 * LoanListItem 을 상속하지 않는다. 상세 응답에는 loanId 가 없고(경로 파라미터로 넘긴
 * 값이라 다시 오지 않는다) bankName 도 없다. 서버 응답을 그대로 옮기는 타입이라
 * 억지로 묶으면 없는 필드를 있다고 믿게 된다.
 */
export interface LoanDetail {
  accountName: string
  /** DB 컬럼이 nullable 이다. 없으면 모달에서 설명 줄을 생략한다 */
  description: string | null
  status: ProductStatus
  isBookmark: boolean
  /** 연 이율(%) */
  interestRate: number
  minLoanBalance: number
  maxLoanBalance: number
  /** 상환 기간(개월) */
  period: number
  /** 가입 가능 최소 업력(개월) */
  firmAge: number
  /**
   * 사업 개시 후여야 신청할 수 있는지 (loan.is_start)
   *
   * 시안에는 '대상: 소상공인' 줄이 있었는데 그런 컬럼이 loan 테이블에 없다.
   * 서버가 주는 실제 자격 요건으로 그 자리를 채운다.
   */
  requiresStart: boolean
  /** 근로자 1명 이상이어야 하는지 (loan.employee_num) */
  requiresEmployee: boolean
  /**
   * 최소 가입 가능 신용등급명. 'B' 같은 값
   *
   * ⚠️ 서버는 이 셋을 conditions 객체 안에 묶어서 준다(LoanConditionResponse).
   *    응답 모양 정렬은 연동 티켓에서 한번에 한다.
   */
  rating: string
}
