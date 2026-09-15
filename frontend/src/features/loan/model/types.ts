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
  /**
   * 판정 결과. status 6종 중 하나를 보낸다.
   *
   * ⚠️ 명세에는 isPossible(boolean) 로 되어 있다. 6상태 중 선택하는 형태로 바꾸기로
   *    확인받았고, 지원사업의 judgement 와 같은 개념이라 이름도 통일해서 가정했다.
   *    파라미터 이름이 확정되면 여기와 LoanFilterBar·목만 고치면 된다.
   */
  judgement?: ProductStatus
  bankName?: string
  isBookmark?: boolean
  sort?: string
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
