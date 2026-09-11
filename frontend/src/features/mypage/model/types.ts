import type { ProductStatus } from '@/shared/constants/productStatus'
import type { AuthProvider, ID, ISODate, ISODateTime } from '@/shared/types'

/**
 * 마이페이지가 화면에 그리는 값.
 *
 * 서버 응답 타입이 아니다. `GET /user/me` 가 이 대부분을 주기로 되어 있지만 아직
 * 확정되지 않은 것이 많다 — businessInfo·myData 가 null 일 수 있는지, 필드가
 * snake_case 인지, 계좌가 여기 실리는지 별도 `/account` 인지.
 *
 * 그래서 화면에 필요한 모양으로 먼저 정의하고 값은 mock.ts 가 채운다.
 */

export interface MyProfile {
  userId: ID
  name: string
  email: string
  /** 소셜 가입이면 비밀번호 변경을 못 한다 */
  provider: AuthProvider
}

/**
 * 사업자 정보. `business_info` 한 행이다.
 *
 * 예비창업자는 null 이다 — 같은 테이블을 쓰지만 brn·상호·주소가 비어 있어
 * 보여줄 것이 없다.
 */
export interface MyBusinessInfo {
  businessName: string
  /** 하이픈 포함 '123-45-67890' */
  brn: string
  ownerName: string
  /** '음식점업 (한식)' 처럼 대분류와 소분류를 합친 문구 */
  industryName: string
  /** 시·군·구까지. 상세 주소는 마이페이지에 필요 없다 */
  region: string
  openDate: ISODate
}

/** 마이데이터 연동 항목 한 줄 */
export interface MyDataLink {
  label: string
  /** 갱신 시각. 한 번도 연동하지 않았으면 null */
  updatedAt: ISODateTime | null
}

export interface MyDataStatus {
  /** 연동 자체를 한 적이 없으면 false — 그때는 '연동하기' 를 보여준다 */
  linked: boolean
  links: MyDataLink[]
}

/** 마이페이지의 계좌 요약. 상세는 연동 계좌 화면(18-3)이 맡는다 */
export interface AccountSummary {
  /** 입출금 합계(원) */
  totalBalance: number
  /** 대출 잔액 합계(원) */
  totalLoanBalance: number
  /** 연동된 계좌 수 */
  accountCount: number
  /** 마이데이터 갱신 시각 */
  updatedAt: ISODateTime
}

/**
 * 출금·실행 계좌. 대출금이 들어오고 자동이체가 빠지는 계좌다.
 *
 * ⚠️ `account` 테이블과 `automatic_transfer` 를 조인한 값으로 보인다. 아직 어느
 *    엔드포인트가 주는지 정해지지 않았다.
 */
export interface PayoutAccount {
  bankName: string
  /** 마스킹된 계좌번호 '****-3412' */
  maskedNumber: string
  autoTransfer: boolean
}

export interface MyPageData {
  profile: MyProfile
  /** 예비창업자는 null */
  business: MyBusinessInfo | null
  myData: MyDataStatus
  /** 마이데이터 연동 전이면 null */
  accountSummary: AccountSummary | null
  payoutAccount: PayoutAccount | null
  /** 새 공고 알림 수신 여부. `PATCH /user/notification` */
  notification: boolean
  /** 바로가기에 붙는 숫자들 */
  shortcut: {
    applicationInProgress: number
    favoriteCount: number
    /** 다음 상환일. 대출이 없으면 null */
    nextRepaymentDate: ISODate | null
  }
}

/* ---------- 18-1 관심 목록 ---------- */

export const FAVORITE_KIND = {
  LOAN: 'LOAN',
  SUPPORT_PROGRAM: 'SUPPORT_PROGRAM',
} as const

export type FavoriteKind = (typeof FAVORITE_KIND)[keyof typeof FAVORITE_KIND]

/**
 * 관심 목록 한 행.
 *
 * 대출과 지원사업을 한 표에 섞어 놓는다. 사용자에게는 '저장해둔 것' 하나라
 * 나누면 두 번 찾아봐야 한다. 대신 유형 칩으로 걸러낼 수 있게 했다.
 *
 * 라벨(`금리` · `지원 금액`)은 항목이 들고 있지 않다. 유형이 정하는 값이라
 * 항목마다 담으면 같은 대출인데 어떤 줄은 '금리', 어떤 줄은 '이자율' 이 될 수 있다.
 * 화면에서 kind 로 정한다.
 */
export interface FavoriteItem {
  /** kind 에 따라 loanId 또는 supportProgramId */
  id: ID
  kind: FavoriteKind
  title: string
  organization: string
  /** '운전자금' · '바우처' 처럼 목록에 붙는 한 마디. 없으면 생략 */
  tag: string | null
  /** 대출은 연 이율(%), 지원사업은 지원 한도(원). 단위는 화면이 붙인다 */
  amount: number
  /** 접수 마감일. null 이면 상시 접수 */
  endDate: ISODate | null
  status: ProductStatus
}

/* ---------- 18-3 연동 계좌 ---------- */

export interface DepositAccount {
  accountId: ID
  bankName: string
  maskedNumber: string
  /** '사업자 입출금 · 주거래' */
  description: string
  balance: number
  /** 대출금이 들어오고 자동이체가 빠지는 계좌 */
  isPayout: boolean
  autoTransfer: boolean
}

export interface LoanAccount {
  accountId: ID
  /** 상품명 */
  name: string
  /** 연 이율(%) */
  interestRate: number
  /** '거치 중 · 첫 상환 10. 15' 처럼 상태를 한 줄로 */
  description: string
  /** 남은 잔액(원) */
  balance: number
}

export interface LinkedAccountsData {
  updatedAt: ISODateTime
  /** 입출금 합계(원) */
  totalBalance: number
  /** 대출 잔액 합계(원) */
  totalLoanBalance: number
  /** 연동 기관 수. 계좌 수가 아니다 — 한 은행에 계좌가 둘일 수 있다 */
  institutionCount: number
  deposits: DepositAccount[]
  loans: LoanAccount[]
}
