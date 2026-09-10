import type { ID, InsuranceStatus, ISODate, SupportProgramType, YearMonth } from '@/shared/types'

/**
 * 사업자 대시보드가 화면에 그리는 값.
 *
 * 서버 응답 타입이 아니다. API 명세의 `GET /dashboard` 는 아직 *(임시)* 로만 적혀 있어
 * 필드가 하나도 확정되지 않았다. 그래서 화면에 필요한 모양으로 먼저 정의하고 값은
 * mock.ts 가 채운다 — 계약이 나오면 이 타입을 응답에 맞춰 고치고 mock 만 지운다.
 *
 * 대시보드는 다른 화면의 요약이라 필드가 목록·상세 응답과 겹친다. 그래도
 * LoanListItem 을 그대로 쓰지 않는다. 목록에는 마감일·상환 기간이 없고 대시보드
 * 카드에는 그 둘이 필요해서, 상속해두면 없는 필드를 있다고 믿게 된다.
 */

/**
 * 상태 → 문구. '다중이용업소법 · 가입 완료' 의 뒷부분이다.
 *
 * ⚠️ 의무보험 전용 화면 티켓이 따로 있다. 그쪽에서도 같은 문구를 쓰게 되면
 *    shared 로 올린다. 지금 쓰는 곳이 이 대시보드뿐이라 여기 둔다.
 */
export const INSURANCE_STATUS_LABEL: Record<InsuranceStatus, string> = {
  COMPLETED: '가입 완료',
  NEEDS_VERIFICATION: '가입 여부 확인 필요',
  REQUIRED: '미가입',
  EXEMPT: '가입 대상 아님',
}

/**
 * 자격 판정 요약. 대출 20개 + 지원사업 32개를 한 번에 센 수다.
 *
 * urgent 는 possible 의 부분집합이다 — 신청할 수 있는데 마감이 임박한 건수.
 * possible + impossible = total 이고 urgent 는 그 합에 들어가지 않는다.
 */
export interface JudgementSummary {
  /** 마이데이터 갱신일. 판정은 이 시점 데이터로 낸 결과다 */
  updatedAt: ISODate
  possible: number
  urgent: number
  impossible: number
  total: number
}

/**
 * 카드 스트립 한 덩어리.
 *
 * 건수가 두 개다. 헤더 옆 `possible` 은 신청 가능 건수, 하단 버튼의 `total` 은 판정한
 * 상품 수 전체다. 스트립에 올리는 카드는 possible 중 앞 몇 장이라 items.length 와
 * possible 이 다르다.
 */
export interface StripSummary<T> {
  possible: number
  total: number
  items: T[]
}

/**
 * 스트립 카드 한 장.
 *
 * status 가 없다. 스트립에는 신청 가능한 것만 담기고(제목이 '지원 가능한 대출'),
 * 카드에 상태 배지를 두지 않기로 했다. 상태로 걸러 보려면 목록 화면의 판정 필터를 쓴다.
 */
export interface DashboardLoan {
  loanId: ID
  /** ⚠️ 상품명이다. 컬럼명이 account_name 이라 계좌명으로 읽히기 쉽다 */
  accountName: string
  bankName: string
  /** 대출 한도 하한(원) */
  minLoanBalance: number
  /** 대출 한도 상한(원) */
  maxLoanBalance: number
  /** 상환 기간(개월). 월납이라 납입 횟수와 같은 값이다 */
  period: number
  /** 접수 마감일. null 이면 상시 */
  endDate: ISODate | null
  isBookmark: boolean
}

export interface DashboardSupportProgram {
  supportProgramId: ID
  /** 지원사업명 */
  pblancNm: string
  /** 소관기관명 */
  jrsdInsttNm: string
  type: SupportProgramType
  /**
   * 지원 금액(원).
   *
   * 목록 타입(SupportProgramListItem)에서는 ETC 에 금액이 없어 판별 유니온이지만
   * 여기서는 필수다. 카드 아래 금액 줄이 비면 카드 높이가 어긋나 비교할 수가 없어서,
   * 금액 없는 사업은 스트립에 올리지 않는다. 표를 쓰는 목록 화면은 상관없다.
   *
   * ⚠️ 판정 결과에 금액 없는 사업이 섞여 올 때 서버가 걸러 줄지 프론트가 걸러야 할지
   *    확인 필요.
   */
  minBalance: number
  maxBalance: number
  /**
   * 연 이율(%). 지원대출(type LOAN)에만 있고 지원금·기타는 null 이다.
   * null 이면 금리 알약을 그리지 않는다 — '금리 -' 는 정보가 아니다.
   */
  interestRate: number | null
  /** 접수 마감일. null 이면 상시 */
  endDate: ISODate | null
  isBookmark: boolean
}

export interface RepaymentSummary {
  /** 다음 상환일 */
  nextDate: ISODate
  /** 이번 달 상환액(원) */
  monthlyAmount: number
  /** 총 대출 잔액(원) */
  totalBalance: number
  /** 금리 인하 요구권처럼 지금 할 수 있는 조치 한 줄. 없으면 줄을 생략한다 */
  advice: string | null
}

export interface DashboardInsurance {
  insuranceId: ID
  name: string
  /** 근거 법령. '다중이용업소법' */
  law: string
  status: InsuranceStatus
}

export interface SalesPoint {
  month: YearMonth
  /** 월 매출(원) */
  amount: number
}

export interface BusinessSnapshot {
  /** 마이데이터 갱신일 */
  updatedAt: ISODate
  /** 최근 월 매출(원) */
  monthlySales: number
  /** 전월 대비 매출 증감(%). 음수면 감소 */
  salesChangeRate: number
  /** 현금 흐름 증감(%). 음수면 악화 */
  cashFlowChangeRate: number
  /** 총 대출 잔액(원) */
  totalLoanBalance: number
  /** 최근 6개월 매출. 오래된 달이 앞이다 */
  recentSales: SalesPoint[]
  /** 갱신 중이면 아래 숫자는 이전 회차 기준이라는 뜻이다 */
  isLinking: boolean
  /** 숫자만으로는 안 보이는 흐름 한 줄. 없으면 줄을 생략한다 */
  summary: string | null
}

export interface OwnerDashboardData {
  judgement: JudgementSummary
  loans: StripSummary<DashboardLoan>
  supportPrograms: StripSummary<DashboardSupportProgram>
  /** 대출이 없으면 null — 상환 패널을 그리지 않는다 */
  repayment: RepaymentSummary | null
  /** 업종에 걸린 의무보험이 없으면 빈 배열 */
  insurances: DashboardInsurance[]
  snapshot: BusinessSnapshot
}
