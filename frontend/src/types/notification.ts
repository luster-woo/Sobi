import type { ID, ISODateTime } from '@/types/common'

/**
 * notification — 알림
 *
 * DOM 전역 `Notification` 과 이름이 겹치므로 `AppNotification` 으로 둡니다.
 */

export const NOTIFICATION_TYPE = {
  /** 신규 지원사업 등록 */
  NEW_SUPPORT_PROGRAM: 'NEW_SUPPORT_PROGRAM',
  /** 신규 대출상품 등록 */
  NEW_LOAN: 'NEW_LOAN',
  /** 지원사업 심사 완료 */
  SUPPORT_PROGRAM_REVIEWED: 'SUPPORT_PROGRAM_REVIEWED',
  /** 대출 심사 완료 */
  LOAN_REVIEWED: 'LOAN_REVIEWED',
} as const

export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE]

export interface AppNotification {
  id: ID
  userId: ID
  type: NotificationType
  /** 조회(확인) 여부 */
  isChecked: boolean
  /** 알림을 발생시킨 도메인의 id — type 에 따라 supportProgram / loan / application 을 가리킵니다 */
  targetId: ID
  /** 알림 발생 시각 */
  createdAt: ISODateTime
  /** 알림 삭제 시각. 소프트 삭제이므로 null 이면 유효한 알림입니다. */
  deletedAt: ISODateTime | null
}
