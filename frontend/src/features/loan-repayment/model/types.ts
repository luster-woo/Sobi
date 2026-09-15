import type { ISODate } from '@/shared/types'

/**
 * 상환 관리 (S15P21D101-201)
 *
 * 서버 응답 타입(Raw*)과 화면이 쓰는 타입을 나눈다. SSAFY 금융망 규격이 그대로 올라와서
 * 금액·금리·회차·날짜가 전부 문자열이고, 날짜는 'YYYYMMDD' 시각은 'HHmmss' 다.
 * 게다가 dailyDueAmount·totalPayoffAmount·interestSaved 만 숫자라 규칙이 섞여 있다.
 *
 * 화면이 이걸 직접 받으면 Number(...) 와 날짜 파싱이 컴포넌트마다 흩어진다. model/normalize.ts
 * 한 곳에서 변환하고, 화면은 정규화된 타입만 본다. 나중에 서버가 숫자·ISO 로 바꿔주면
 * 변환 함수만 지우면 되고, 화면은 한 줄도 안 바뀐다.
 *
 * ⚠️ 백엔드가 "초안이고 금융망 연결 과정에서 컬럼이 바뀔 수 있다" 고 했다. 바뀌면
 *    Raw* 타입과 normalize 만 고치면 된다.
 *
 * 값이 없는 자리는 빈 문자열이 아니라 null 로 온다고 본다. 백엔드 DTO 가 전부
 * 래퍼 타입(String·List)이라 금융망이 필드를 빼고 주면 Jackson 이 null 을 채우고,
 * 그대로 JSON null 이 되어 내려온다. 상환 성공 행의 failureReason 처럼 '값이 없는
 * 게 정상' 인 자리가 있어서 예외가 아니라 일상이다.
 */

// ---------- 서버 응답 그대로 ----------

export interface RawLoanProduct {
  accountNo: string
  /** 상품명 */
  accountName: string
  /** ⚠️ 서버가 만들어 준다고 확정. 필드명은 가정이다 — 확정되면 여기와 normalize 만 고친다 */
  bankName: string
  /** '개설' · '상환중' 등. ⚠️ 전체 값 목록 확인 대기 */
  status: string
  accountTypeUniqueNo: string
  /** 총 회차. 금융망이 매일 08:30 에 한 회차씩 상환하므로 사실상 일수다 */
  loanPeriod: string
  /** 'YYYYMMDD' */
  loanDate: string
  maturityDate: string
  /** 대출 원금(원) */
  loanBalance: string
  /** 연 이율(%) */
  interestRate: string
  withdrawalAccountNo: string
  /** 1회(=하루) 상환액(원). 이것만 숫자로 온다 */
  dailyDueAmount: number
}

export interface RawRepaymentRecord {
  installmentNumber: string
  /** 'SUCCESS' 등. ⚠️ 실패 값이 무엇인지 확인 대기 */
  status: string
  paymentBalance: string
  /** 'YYYYMMDD' */
  repaymentAttemptDate: string | null
  /** 'HHmmss' */
  repaymentAttemptTime: string | null
  /** 실제로 빠져나간 시각. 실패한 회차에는 없다 */
  repaymentActualDate: string | null
  repaymentActualTime: string | null
  /** 실패 사유. 성공한 회차에는 없다 — 대부분의 행이 여기 해당한다 */
  failureReason: string | null
}

export interface RawRepaymentDetail {
  accountNo: string
  accountName: string
  status: string
  accountTypeUniqueNo: string
  loanBalance: string
  remainingLoanBalance: string
  withdrawalAccountNo: string
  /** 한 회차도 상환되지 않았으면 빈 배열 대신 null 일 수 있다 */
  repaymentRecords: RawRepaymentRecord[] | null
  /**
   * 지금 한 번에 갚을 때 내는 총액.
   *
   * ⚠️ 2026-09-15 현재 서버가 이 자리에 remainingLoanBalance(원금+이자)를 넣어
   *    보낸다(RepaymentServiceImpl:137). 백엔드 수정 대기 중이라 화면 숫자가
   *    실제보다 크다. 프론트에서 역산하지 않는다 — 고쳐지면 두 번 틀어진다.
   */
  totalPayoffAmount: number
  interestSaved: number
}

// ---------- 화면이 쓰는 타입 ----------

export interface LoanProduct {
  accountNo: string
  accountName: string
  bankName: string
  status: string
  loanPeriod: number
  loanDate: ISODate
  maturityDate: ISODate
  loanBalance: number
  interestRate: number
  withdrawalAccountNo: string
  dailyDueAmount: number
}

/** 회차 상태. 서버 값이 확정되면 유니온으로 좁힌다 */
export const REPAYMENT_RECORD_STATUS = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
} as const

export interface RepaymentRecord {
  installmentNumber: number
  status: string
  paymentBalance: number
  /** 출금을 시도한 날 */
  attemptDate: ISODate | null
  attemptTime: string | null
  /** 실제로 빠진 날. 실패하면 null */
  actualDate: ISODate | null
  actualTime: string | null
  /** 성공이면 null */
  failureReason: string | null
}

export interface RepaymentDetail {
  accountNo: string
  accountName: string
  status: string
  /** 대출 원금 */
  loanBalance: number
  /** 남은 원금 */
  remainingLoanBalance: number
  withdrawalAccountNo: string
  records: RepaymentRecord[]
  /** 지금 완납할 때 내야 하는 총액 */
  totalPayoffAmount: number
  /** 완납으로 아끼는 이자 */
  interestSaved: number
}
