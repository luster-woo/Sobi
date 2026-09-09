import type { ID, ISODateTime } from '@/shared/types/common'

/** 상태 전이: SUBMITTED → REVIEWING → APPROVED / REJECTED */
export const APPLICATION_STATUS = {
  SUBMITTED: 'SUBMITTED', // 신청 완료
  REVIEWING: 'REVIEWING', // 심사 중
  APPROVED: 'APPROVED', // 승인
  REJECTED: 'REJECTED', // 반려
} as const

export type ApplicationStatus = (typeof APPLICATION_STATUS)[keyof typeof APPLICATION_STATUS]

/**
 * 🔴 스키마와 명세가 어긋난다. `V1__init.sql` 의 `application` 컬럼은
 *    `user_id` · `business_id` · `loan_id` · `status` · `reject_reason` ·
 *    `subject_at` · `complete_at` 이고 **`support_program_id` 가 없다.**
 *    그런데 명세는 `POST /application?type=loan|support` 로 지원사업 신청도 받는다.
 *    지원사업 신청을 어디에 저장할지 백엔드 확인이 필요하다.
 *
 *    아래는 스키마 기준이다. `support_program_id` 컬럼이 추가되면 여기에 넣는다.
 */
export interface Application {
  id: ID
  userId: ID
  /** 신청 당시의 업체. 업체가 지워지면 null 이 된다 (ON DELETE SET NULL) */
  businessId: ID | null
  loanId: ID | null
  status: ApplicationStatus
  /** status 가 REJECTED 일 때만 채워진다 */
  rejectReason: string | null
  /** 접수 시각 (`subject_at`) */
  subjectAt: ISODateTime
  /** 심사 완료 시각 (`complete_at`). 진행 중이면 null */
  completeAt: ISODateTime | null
}
