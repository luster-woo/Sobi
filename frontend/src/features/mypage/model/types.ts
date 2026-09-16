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

/**
 * 관심 목록 항목의 유형.
 *
 * ⚠️ 값이 `BOOKMARK_TARGET`(`shared/types/bookmark.ts`)과 같다 — 지원사업이
 *    `SUPPORT_PROGRAM` 이 아니라 `SUPPORT` 다. 담기·빼기 API 의 `type` 쿼리에
 *    이 값을 그대로 실어 보내려고 맞춰 뒀다. 한쪽만 고치면 변환 함수가 하나 더 생긴다.
 */
export const FAVORITE_KIND = {
  LOAN: 'LOAN',
  SUPPORT: 'SUPPORT',
} as const

export type FavoriteKind = (typeof FAVORITE_KIND)[keyof typeof FAVORITE_KIND]

/** 두 유형이 같이 들고 있는 것. 제목·기관·상태는 어느 쪽이든 있다 */
interface FavoriteBase {
  /** kind 에 따라 loanId 또는 supportProgramId */
  id: ID
  title: string
  /** 대출은 은행명, 지원사업은 소관기관명 */
  organization: string
  status: ProductStatus
}

/**
 * 관심 목록의 대출 한 행.
 *
 * 값은 대출 목록 표(loanColumns)와 같은 것을 보여준다 — 금리와 한도. 같은 상품이
 * 두 화면에서 다른 값으로 읽히면 저장해둔 것과 같은 것인지 확인해야 한다.
 *
 * ⚠️ 마감일이 없다. `loan` 테이블에 end_date 컬럼 자체가 없는 상시 접수 상품이라
 *    서버가 줄 것이 없다. 지원사업에만 있는 필드라 유니온으로 갈라 뒀다 —
 *    `endDate: null` 로 두면 '아직 안 받아온 것' 과 '원래 없는 것' 이 구분되지 않는다.
 */
export interface FavoriteLoan extends FavoriteBase {
  kind: typeof FAVORITE_KIND.LOAN
  /** 연 이율(%) */
  interestRate: number
  /** 한도 상한(원) */
  maxLoanBalance: number
  /** 대출 기간(개월). 보조 문구에 '36개월' 로 붙는다 */
  period: number
}

/**
 * 관심 목록의 지원사업 한 행.
 *
 * 금액·마감일·이자율이 전부 null 일 수 있다. `support_program` 테이블에서 셋 다
 * nullable 이고, 공고 원문에 금액이나 마감이 안 적힌 건이 실제로 있다.
 */
export interface FavoriteSupportProgram extends FavoriteBase {
  kind: typeof FAVORITE_KIND.SUPPORT
  /** 지원 금액 상한(원). 공고에 안 적혀 있으면 null */
  maxBalance: number | null
  /** 접수 마감일. null 이면 상시 접수 */
  endDate: ISODate | null
  /**
   * 연 이율(%). 융자형 공고에만 있고 보조금·바우처면 null 이다.
   * 값이 있을 때만 보조 문구에 덧붙인다.
   */
  interestRate: number | null
}

/**
 * 관심 목록 한 행.
 *
 * 대출과 지원사업을 한 표에 섞어 놓는다. 사용자에게는 '저장해둔 것' 하나라
 * 나누면 두 번 찾아봐야 한다. 대신 유형 칩으로 걸러낼 수 있게 했다.
 *
 * 구별 유니온인 이유: 두 유형이 가진 값이 실제로 다르다(대출은 기간, 지원사업은
 * 마감일). 한 인터페이스에 다 넣고 nullable 로 두면 화면에서 `item.endDate` 를
 * 무심코 읽었을 때 대출 행에서 조용히 비어 버린다. 갈라 두면 타입이 먼저 막는다.
 *
 * 라벨(`금리` · `지원 금액`)은 항목이 들고 있지 않다. 유형이 정하는 값이라
 * 항목마다 담으면 같은 대출인데 어떤 줄은 '금리', 어떤 줄은 '이자율' 이 될 수 있다.
 * 화면에서 kind 로 정한다.
 */
export type FavoriteItem = FavoriteLoan | FavoriteSupportProgram

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
