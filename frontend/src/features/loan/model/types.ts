import type { LoanStatus } from '@/shared/constants/productStatus'

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
  status: LoanStatus
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
  statusCounts: Record<LoanStatus, number>
  loans: LoanListItem[]
}

/** 목록 조회 쿼리. undefined 인 필터는 axios 가 알아서 빼고 보낸다 */
export interface LoanListParams {
  /** 상품명·은행명 부분 일치 검색 */
  keyword?: string
  /** 판정 결과 + 내 신청 상태를 합친 값 */
  status?: LoanStatus
  /*
   * 서버에는 bankName 필터가 남아 있다(LoanSearchCondition). 화면에서 뺐을 뿐이라
   * 되살리려면 이 줄과 LoanFilterBar 의 Select 만 돌려놓으면 된다.
   */
  /** true 일 때만 거른다. false 를 보내도 서버는 필터하지 않는다 */
  bookmarked?: boolean
  sort?: LoanSort
}

/** 대출 신청 조건. 서버가 conditions 객체로 묶어서 준다 */
export interface LoanConditions {
  /**
   * 최소 가입 가능 신용등급명. 'B' 같은 값.
   *
   * ⚠️ nullable 여부가 확인되지 않았다. 불가 사유 문구에 '등급이 없으면 (현재 등급 없음)'
   *    이라는 갈래가 있는데, 그건 사용자 등급이지 상품 요구 등급이 아니다.
   */
  ratingName: string
  /**
   * 사업 개시 후여야 신청할 수 있는지 (loan.is_start)
   *
   * 시안에는 '대상: 소상공인' 줄이 있었는데 그런 컬럼이 loan 테이블에 없다.
   * 서버가 주는 실제 자격 요건으로 그 자리를 채운다.
   */
  requiresStart: boolean
  /** 근로자 1명 이상이어야 하는지 (loan.employee_num) */
  requiresEmployee: boolean
  /** 최소 업력(년). 목록 시절 '개월' 로 가정했는데 서버 주석이 '년' 이다 */
  firmAge: number
}

/**
 * 대출 상품 상세.
 *
 * LoanListItem 을 상속하지 않는다. 겹치는 필드가 많지만 상세에만 있는 것(conditions ·
 * applicationId · ineligibleReasons)과 목록에만 있는 것이 갈려서, 억지로 묶으면
 * 어느 쪽에 무엇이 오는지 읽히지 않는다.
 */
export interface LoanDetail {
  loanId: number
  accountName: string
  bankName: string
  /** DB 컬럼이 nullable 이다. 없으면 모달에서 설명 줄을 생략한다 */
  description: string | null
  /** 연 이율(%) */
  interestRate: number
  minLoanBalance: number
  maxLoanBalance: number
  /** 대출 기간(일). 금융망이 매일 한 회차씩 상환해서 회차 수와 같다 */
  period: number
  /** '원리금균등상환'. 금융망 대출은 이 방식 하나뿐이라 서버가 상수로 박아 보낸다 */
  repaymentMethod: string
  conditions: LoanConditions
  status: LoanStatus
  /**
   * 진행 중인 신청 id. 상태가 신청에서 온 값일 때만 온다(PREPARING~PAID).
   * ELIGIBLE·INELIGIBLE 이면 null — 아직 신청한 적이 없다는 뜻이다.
   */
  applicationId: number | null
  /**
   * 신청할 수 없는 이유. 완성된 문장으로 온다.
   *   '신용등급 C 이상 필요 (현재 D)' · '업력 3년 이상 필요 (현재 1년)'
   *
   * 자격이 되면 빈 배열이다. 서버가 상태와 무관하게 항상 내려준다 — 서류를 준비하는
   * 동안 신용등급이 떨어질 수 있어서, 작성 중인데 사유가 차 있는 경우가 생긴다.
   */
  ineligibleReasons: string[]
  bookmarked: boolean
}
