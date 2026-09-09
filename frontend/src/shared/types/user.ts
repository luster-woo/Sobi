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

export const AUTH_PROVIDER = {
  LOCAL: 'LOCAL',
  GOOGLE: 'GOOGLE',
} as const

export type AuthProvider = (typeof AUTH_PROVIDER)[keyof typeof AUTH_PROVIDER]

/**
 * `user` 테이블. password 컬럼은 응답에 포함되지 않아 제외했다.
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
