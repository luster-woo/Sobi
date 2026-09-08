import type { ID, ISODateTime } from '@/shared/types/common'

/**
 * 지원사업·대출 즐겨찾기를 한 테이블에서 겸한다.
 * 두 FK 모두 NULL 허용이고 실제로는 하나만 채워진다.
 */
export interface Bookmark {
  id: ID
  userId: ID
  loanId: ID | null
  supportProgramId: ID | null
  createdAt: ISODateTime
}

/** 토글 API 에서 어느 쪽 즐겨찾기인지 지정할 때 쓴다 */
export const BOOKMARK_TARGET = {
  LOAN: 'LOAN',
  SUPPORT_PROGRAM: 'SUPPORT_PROGRAM',
} as const

export type BookmarkTarget = (typeof BOOKMARK_TARGET)[keyof typeof BOOKMARK_TARGET]
