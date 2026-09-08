import type { ID, ISODateTime } from '@/shared/types/common'

/** targetId 가 가리키는 테이블이 이 값에 따라 달라진다 */
export const NOTIFICATION_TYPE = {
  NEW_SUPPORT_PROGRAM: 'NEW_SUPPORT_PROGRAM', // targetId → support_program
  NEW_LOAN: 'NEW_LOAN', // targetId → loan
  SUPPORT_PROGRAM_REVIEWED: 'SUPPORT_PROGRAM_REVIEWED', // targetId → application
  LOAN_REVIEWED: 'LOAN_REVIEWED', // targetId → application
} as const

export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE]

/**
 * DOM 전역 `Notification` 과 이름이 겹쳐 AppNotification 으로 뒀다.
 * `Notification` 으로 쓰면 타입 에러 없이 브라우저 API 를 참조해 버린다.
 */
export interface AppNotification {
  id: ID
  userId: ID
  type: NotificationType
  /** 조회 여부. ERD 기본값 false */
  isChecked: boolean
  /** type 에 따라 다른 테이블의 id 다 — 위 NOTIFICATION_TYPE 주석 참고 */
  targetId: ID
  createdAt: ISODateTime
  /** 소프트 삭제. null 이면 유효한 알림이다 */
  deletedAt: ISODateTime | null
}
