import type { ID, ISODateTime } from '@/types/common'

/** application — 신청 목록 (지원사업 / 대출 공용) */

export const APPLICATION_STATUS = {
  /** 신청 완료 */
  SUBMITTED: 'SUBMITTED',
  /** 심사 중 */
  REVIEWING: 'REVIEWING',
  /** 승인 */
  APPROVED: 'APPROVED',
  /** 반려 */
  REJECTED: 'REJECTED',
} as const

export type ApplicationStatus = (typeof APPLICATION_STATUS)[keyof typeof APPLICATION_STATUS]

/**
 * 하나의 신청은 지원사업 또는 대출 중 하나만 가리킵니다.
 * (ERD 상 두 FK 가 모두 NULL 허용)

 //upport_program_id 의 오타로 판단했습니다. 백엔드와 확인 필요.
**/
export interface Application {
  id: ID
  userId: ID
  supportProgramId: ID | null
  loanId: ID | null
  status: ApplicationStatus
  /** 반려 사유. status 가 REJECTED 일 때만 값이 있습니다. */
  rejectReason: string | null
  /** 신청 날짜 */
  createdAt: ISODateTime
  /** 처리 날짜 */
  updatedAt: ISODateTime
}
