import type { ID, ISODateTime } from '@/shared/types/common'

/**
 * 상태 전이: PREPARING → SUBMITTED → REVIEW → APPROVED → PAID / REJECTED
 *
 * PREPARING 은 신청 화면에 머무르는 동안이다. 서류를 올리고 금액을 입력하는 동안
 * 서버에 행이 이미 있어야 서류를 붙일 수 있어서, 신청하기를 누를 때 만들어진다.
 *
 * ⚠️ REVIEW 는 ProductStatus 와 맞춘 철자다. 대출 목록 API 가 이미 REVIEW 로
 *    내려주고 있어서, 같은 개념을 두 철자로 들고 있으면 매핑할 때 어긋난다.
 *    백엔드가 REVIEWING 으로 확정하면 여기와 statusBadge 만 고치면 된다.
 */
export const APPLICATION_STATUS = {
  PREPARING: 'PREPARING', // 신청 준비중
  SUBMITTED: 'SUBMITTED', // 신청 완료
  REVIEW: 'REVIEW', // 심사 중
  APPROVED: 'APPROVED', // 승인
  PAID: 'PAID', // 대출은 실행 완료, 지원사업은 지급 완료
  REJECTED: 'REJECTED', // 반려
} as const

export type ApplicationStatus = (typeof APPLICATION_STATUS)[keyof typeof APPLICATION_STATUS]

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  PREPARING: '신청 준비중',
  SUBMITTED: '신청 완료',
  REVIEW: '심사 중',
  APPROVED: '승인',
  // 대출은 '실행 완료', 지원사업은 '지급 완료' 로 갈린다.
  // 도메인을 모르는 곳에서 쓸 기본값만 두고, 가르는 건 features/application 에 있다
  PAID: '완료',
  REJECTED: '반려',
}

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
