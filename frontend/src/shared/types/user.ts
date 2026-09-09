import type { ID, ISODateTime } from '@/shared/types/common'

/**
 * 이 값에 따라 붙는 업체 테이블이 갈린다.
 * OWNER → `business_info`, PRE_OWNER → `pre_business_info`.
 * 
 * 여기 erd에 나와있는 역할명이랑 달라서 나중에 변경 체크해야함
 */
export const USER_ROLE = {
  OWNER: 'OWNER', // 창업자 — 사업자등록 완료
  PRE_OWNER: 'PRE_OWNER', // 예비 창업자 — 창업 준비 단계
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
  /** 소셜 가입 직후에는 없다. 업체 등록 단계에서 받는다 */
  phoneNumber: string | null
  /** 신용등급명 (VARCHAR(3), 예: 'AA'). 대출 상품의 ratingName 과 비교하는 값 */
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
