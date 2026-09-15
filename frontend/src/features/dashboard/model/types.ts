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
  /**
   * 마이데이터 갱신일. 판정은 이 시점 데이터로 낸 결과다.
   *
   * 예비창업자는 null 이다 — 연동할 마이데이터가 없고 업종·지역만으로 판정하므로
   * 갱신일이라는 개념 자체가 없다. 그때는 갱신 문구를 빼고 '자격 판정' 만 적는다.
   */
  updatedAt: ISODate | null
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

/**
 * 의무보험 체크리스트 한 줄. `GET /insurance` 의 `insurances` 항목에서 화면이 쓰는 것만 추렸다.
 *
 * ⚠️ id 가 `insurance.id` 가 아니라 `insurance_checklist.id` 다. 앞은 보험 종류이고
 *    뒤는 '이 업체의 이 보험' 이라 값이 다르다. 상세·상태 변경도 이 id 를 쓴다.
 *
 * 명세에는 목록 키가 `insuranceList`, 이름 필드가 `insuranceName`, status 가 한글로
 * 적혀 있지만 구현은 `insurances` · `name` · 영문 enum 이다. 구현을 따른다.
 */
export interface DashboardInsurance {
  insuranceChecklistId: ID
  name: string
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

/**
 * 예비창업자가 입력한 창업 조건.
 *
 * 예비창업자도 `business_info` 를 쓴다. 별도 테이블이 없고, 추천·보험이 전부
 * `business_id` 를 FK 로 잡고 있어서(suggest_loan · suggest_support_program ·
 * insurance_checklist) 행이 없으면 아무것도 붙일 수가 없다.
 *
 * 그래서 여기 두 값은 `business_info` 의 부분집합이다 —
 * `business_code_id`(minor_code) 와 `region`.
 *
 * ⚠️ 같은 테이블의 `brn`·`business_name`·`address`·`open_date` 가 전부 NOT NULL 이고
 *    brn 은 UNIQUE 다. 예비창업자 행을 무엇으로 채울지 백엔드와 정해야 한다 —
 *    빈 문자열로 채우면 두 번째 예비창업자의 INSERT 가 UNIQUE 제약에 걸린다.
 */
export interface StoreCondition {
  /** minor_code.id. 아직 안 고른 상태가 있어 null 을 허용한다 */
  industryMinorId: ID | null
  /**
   * 지역 3단. 상권 분석이 동 단위로 돌아가서(`seoul_commercial_data` 의
   * district_code·dong_code) 시·군·구까지만으로는 분석할 수가 없다.
   *
   * ⚠️ `business_info.region` 은 VARCHAR 한 칸이다. 저장할 때 셋을 합칠지
   *    컬럼을 쪼갤지 백엔드와 정해야 한다.
   */
  province: string
  district: string
  dong: string
}

/**
 * 의무보험은 여기 없다. 대시보드 응답에 얹지 않고 `GET /insurance` 를 따로 부른다 —
 * 상태를 바꾸면 그 목록만 다시 받으면 되고, 대시보드 전체를 무효화할 이유가 없다.
 */
export interface OwnerDashboardData {
  judgement: JudgementSummary
  loans: StripSummary<DashboardLoan>
  supportPrograms: StripSummary<DashboardSupportProgram>
  /** 대출이 없으면 null — 상환 패널을 그리지 않는다 */
  repayment: RepaymentSummary | null
  snapshot: BusinessSnapshot
}

/**
 * 예비창업자 대시보드 (S15P21D101-178).
 *
 * 사업자와 겹치는 것은 스트립 둘과 의무보험뿐이다. 판정 요약·상환·매출이 없는 이유는
 * 전부 마이데이터에서 오는 값이라, 사업자등록이 없으면 판정할 근거 자체가 없어서다.
 * 대신 조건 입력이 맨 위에 온다 — 그것이 이 사용자가 제일 먼저 할 일이다.
 */
export interface PreOwnerDashboardData {
  condition: StoreCondition
  /** updatedAt 은 null 이다. 마이데이터 없이 업종·지역만으로 낸 판정이다 */
  judgement: JudgementSummary
  loans: StripSummary<DashboardLoan>
  supportPrograms: StripSummary<DashboardSupportProgram>
  /** 고른 업종에 걸리는 의무보험. 개업 전이라 가입 여부가 아니라 목록이 정보다 */
  insurances: DashboardInsurance[]
}
