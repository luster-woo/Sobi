import type { ProductStatus } from '@/shared/constants/productStatus'
import type { AuthProvider, ID, ISODate, ISODateTime, UserRole } from '@/shared/types'

/**
 * 마이페이지가 화면에 그리는 값. `GET /user/mypage` 응답을 화면 모양으로 바꾼 것이다.
 *
 * 응답을 그대로 쓰지 않는 이유는 표기가 섞여 있어서다 — `business_name` · `business_type`
 * 은 snake_case 인데 `openDate` · `bsn` 은 아니고, 합계 이름도 `balanceSum` 이다.
 * 변환은 `api/me.ts` 한 곳에서만 하고 화면은 아래 타입만 본다.
 */

/**
 * ⚠️ `userId` 는 담지 않는다. 쓰는 곳이 마이데이터 쿨다운 키뿐인데 거기는 세션
 *    스토어에서 읽고, 세션 복구(`GET /user/me`)가 화면보다 먼저 돈다.
 */
export interface MyProfile {
  name: string
  email: string
  role: UserRole
  /** 소셜 가입이면 비밀번호를 바꿀 수 없다 */
  provider: AuthProvider
}

/**
 * 사업자 정보. 예비창업자는 null 이다 — `business_info` 행 자체가 없다.
 *
 * ⚠️ `ownerName` 은 응답의 `name` 이다. `GET /business/me` 의 `name` 은 상호명이
 *    한 번 더 들어간 값이라 뜻이 다르다 — 두 API 를 같은 타입으로 묶지 말 것.
 */
export interface MyBusinessInfo {
  businessName: string
  /** 하이픈 포함 '123-45-67890' */
  brn: string
  ownerName: string
  industryName: string
  /** 전체 주소. 시·군·구만 필요하면 화면에서 자른다 */
  address: string
  openDate: ISODate
}

/** 마이데이터 연동 상태. 연동한 적이 없으면 null */
export interface MyDataStatus {
  /** 마이데이터가 채우는 값. 수집에 실패했으면 null 일 수 있다 */
  creditRating: string | null
  /** 마지막으로 수집한 시각 */
  linkedAt: ISODateTime
}

/** 연동 계좌 요약. 마이데이터 연동 전이면 null */
export interface AccountSummary {
  /** 입출금 합계(원) */
  totalBalance: number
  /** 대출 잔액 합계(원) */
  totalLoanBalance: number
  /** 연동된 계좌 수. 기관 수가 아니다 */
  accountCount: number
}

/**
 * 입출금 계좌 한 줄.
 *
 * ⚠️ `accountNo` 는 원본이다. 화면에는 `maskAccountNo` 로 가려서 띄운다 (395).
 */
export interface DepositAccount {
  bankName: string
  accountNo: string
  balance: number
}

export interface MyPageData {
  profile: MyProfile
  /** 예비창업자는 null */
  business: MyBusinessInfo | null
  /** 연동 전이면 null */
  myData: MyDataStatus | null
  /** 연동 전이면 null */
  accountSummary: AccountSummary | null
  /** 연동 전이면 빈 배열 */
  deposits: DepositAccount[]
  /** 새 공고 알림 수신 여부. `PATCH /user/notification` 로 뒤집는다 */
  notification: boolean
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
  /**
   * 대출 기간(**일**). 보조 문구에 '360일' 로 붙는다.
   *
   * ⚠️ 개월이 아니다. 금융망 대출이 일 단위로 매일 한 회차씩 갚는 구조라
   *    백엔드 `LoanDetailResponse` 도 '대출 기간(일)' 로 적어 뒀다.
   */
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
  /** 연 이율(%). 융자형 공고에만 있고 보조금·바우처면 null */
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
 */
export type FavoriteItem = FavoriteLoan | FavoriteSupportProgram
