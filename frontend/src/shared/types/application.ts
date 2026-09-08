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
 * 지원사업 신청과 대출 신청을 한 테이블에서 겸한다.
 * supportProgramId·loanId 중 하나만 채워지고 나머지는 null 이므로,
 * 목록 화면에서 어느 쪽 신청인지는 이 두 필드로 판별한다.
 *
 * ⚠️ ERD 컬럼명은 `business_id` 인데 한글 라벨이 '지원사업 아이디' 다.
 *    `support_program_id` 오타로 보고 supportProgramId 로 뒀다 — 백엔드 확인 필요.
 *    실제로 업체 id 라면 목록 조회 기준이 유저가 아니라 업체가 되므로 영향이 크다.
 */
export interface Application {
  id: ID
  userId: ID
  supportProgramId: ID | null
  loanId: ID | null
  status: ApplicationStatus
  /** status 가 REJECTED 일 때만 채워진다 */
  rejectReason: string | null
  createdAt: ISODateTime
  /** 처리 날짜. 심사 상태가 바뀔 때 갱신된다 */
  updatedAt: ISODateTime
}
