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

/**
 * 토글 API 의 `type` 쿼리에 그대로 실리는 값.
 *
 * ⚠️ 지원사업이 `SUPPORT_PROGRAM` 이 아니라 `SUPPORT` 다. 백엔드
 *    `BookmarkServiceImpl` 이 `"LOAN"` · `"SUPPORT"` 문자열만 받고 그 외에는
 *    400 TYPE_BAD_REQUEST 를 준다. 테이블·엔티티 이름은 support_program 이라
 *    헷갈리기 쉬운데, 통신에 나가는 값은 이쪽이 맞다.
 */
export const BOOKMARK_TARGET = {
  LOAN: 'LOAN',
  SUPPORT: 'SUPPORT',
} as const

export type BookmarkTarget = (typeof BOOKMARK_TARGET)[keyof typeof BOOKMARK_TARGET]
