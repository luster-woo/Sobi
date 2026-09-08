import type { ID, ISODateTime } from '@/types/common'

/**
 * bookmark — 유저 즐겨찾기
 *
 * 지원사업·대출 상품 공용이라 두 FK 가 모두 NULL 허용입니다.
 * 실제로는 둘 중 하나만 채워집니다.
 */
export interface Bookmark {
  id: ID
  userId: ID
  loanId: ID | null
  supportProgramId: ID | null
  createdAt: ISODateTime
}

/** 즐겨찾기 대상 종류 — 토글 API 요청에 사용 */
export const BOOKMARK_TARGET = {
  LOAN: 'LOAN',
  SUPPORT_PROGRAM: 'SUPPORT_PROGRAM',
} as const

export type BookmarkTarget = (typeof BOOKMARK_TARGET)[keyof typeof BOOKMARK_TARGET]
