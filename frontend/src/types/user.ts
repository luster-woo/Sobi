import type { ID, ISODateTime } from '@/types/common'

/**
 * user / account 테이블
 *
 * password 컬럼은 응답에 절대 포함되지 않으므로 타입에서도 제외합니다.
 */

/** user.role — 창업자 / 예비 창업자 */
export const USER_ROLE = {
  /** 창업자 — 사업자등록을 마친 실운영자 */
  OWNER: 'OWNER',
  /** 예비 창업자 — 창업 준비 단계 */
  PRE_OWNER: 'PRE_OWNER',
} as const

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE]

/** user.provider — 소셜 제공자 */
export const AUTH_PROVIDER = {
  LOCAL: 'LOCAL',
  GOOGLE: 'GOOGLE',
} as const

export type AuthProvider = (typeof AUTH_PROVIDER)[keyof typeof AUTH_PROVIDER]

/** user — 유저 */
export interface User {
  id: ID
  email: string
  name: string
  role: UserRole
  /** 휴대폰 번호. 소셜 가입 직후에는 없을 수 있습니다. */
  phoneNumber: string | null
  /** 신용등급 (VARCHAR(3), 예: 'AA', 'B'). 미입력 시 null */
  creditRating: string | null
  provider: AuthProvider
  /** 소셜 제공자가 준 고유 id. LOCAL 가입이면 null */
  providerId: string | null
  /** 알림 수신 동의 여부 */
  notification: boolean
  /** 가입 날짜 */
  createdAt: ISODateTime
  updatedAt: ISODateTime | null
}

/** account — 사용자 계좌 */
export interface Account {
  id: ID
  userId: ID
  bankName: string
  /** 계좌번호 (VARCHAR(16)) */
  accountNo: string
  /** 대표 계좌 여부 */
  isMain: boolean
}
