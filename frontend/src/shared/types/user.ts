import type { ID, ISODateTime } from '@/shared/types/common'

/**
 * `V1__init.sql` 의 `chk_users_role` 제약값이다.
 *   CHECK (role IN ('ENTREPRENEUR', 'PREENTREPRENEUR'))
 *
 * ENTREPRENEUR 는 `business_info` 레코드를 갖고, PREENTREPRENEUR 는 갖지 않는다.
 * ERD 에 있던 `pre_business_info` 테이블은 실제 스키마에 없다 — 예비 창업자의
 * 희망 업종·지역을 저장할 곳이 아직 없다.
 */
export const USER_ROLE = {
  ENTREPRENEUR: 'ENTREPRENEUR', // 창업자 — 사업자등록 완료
  PREENTREPRENEUR: 'PREENTREPRENEUR', // 예비 창업자 — 창업 준비 단계
} as const

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE]

/**
 * 예비 창업자인가. **role 이 null 이어도 예비 창업자로 본다** (팀 결정).
 *
 * null 이 생기는 경로는 구글 신규 가입 하나다 — 로컬 가입은 백엔드가
 * `PREENTREPRENEUR` 를 넣는다(`AuthServiceImpl.signup`). 사업자가 되는 길은
 * `POST /business` 로 업체를 등록하는 것뿐이고 그때 `ENTREPRENEUR` 로 바뀐다.
 *
 * 그래서 판정은 '사업자가 아니면 전부 예비 창업자' 다. 세 군데에서 각자
 * `role === PREENTREPRENEUR` 로 비교하면 null 이 어디서는 예비 창업자, 어디서는
 * 미정으로 갈려 화면이 서로 어긋난다.
 */
export function isPreOwner(role: UserRole | null): boolean {
  return role !== USER_ROLE.ENTREPRENEUR
}

export const AUTH_PROVIDER = {
  LOCAL: 'LOCAL',
  GOOGLE: 'GOOGLE',
} as const

export type AuthProvider = (typeof AUTH_PROVIDER)[keyof typeof AUTH_PROVIDER]

/**
 * `user` 테이블. password 컬럼은 응답에 포함되지 않아 제외했다.
 *
 * ⚠️ 세션(`useAuthStore`)이 담는 건 이게 아니라 `SessionUser` 다. 로그인 응답은
 *    `userId`·`email`·`name`·`role` 네 개만 준다. 이 타입은 `GET /user/me` 가
 *    생기면 쓴다 (BE-02).
 *
 * ERD 상 deleted_at 으로 소프트 삭제하지만, 탈퇴한 유저는 조회 대상이 아니라
 * 프론트로 내려올 일이 없어 타입에 넣지 않았다.
 */
export interface User {
  id: ID
  email: string
  name: string
  role: UserRole
  /**
   * 신용등급명 (VARCHAR(3), 예: 'AA'). 대출 상품의 ratingName 과 비교하는 값.
   * 마이데이터 연동으로 채워지므로 연동 전에는 null 이다.
   */
  creditRating: string | null
  provider: AuthProvider
  /** provider 가 LOCAL 이면 null */
  providerId: string | null
  /** 알림 수신 동의. ERD 기본값 true */
  notification: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime | null
}

export interface Account {
  id: ID
  userId: ID
  bankName: string
  accountNo: string
  /** 유저당 하나만 true */
  isMain: boolean
}
