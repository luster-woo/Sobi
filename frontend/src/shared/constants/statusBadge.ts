import type { SubmitDocumentStatus, WriteDocumentStatus } from '@/shared/constants/documentStatus'
import type { SupportStatus } from '@/shared/constants/productStatus'
import type { ApplicationStatus } from '@/shared/types/application'
import type { InsuranceStatus } from '@/shared/types/insurance'
import type { BadgeVariant } from '@/shared/ui/Badge'

/**
 * 서버 상태값 → Badge 색.
 *
 * 화면마다 따로 매핑하면 같은 '심사 중'이 대출 목록에서는 회색, 신청 현황에서는
 * 주황으로 나온다. 색 기준은 index.css 의 Status 주석에 있다.
 *
 * ERD 상태 16개를 리디자인의 3색으로 칠하면 '신청 완료'와 '심사 중'이 같은 색이 되어
 * 사용자가 기다려야 하는지 뭘 해야 하는지 구분할 수 없다. 그래서 6단계로 나눴다.
 */

export const APPLICATION_STATUS_VARIANT: Record<ApplicationStatus, BadgeVariant> = {
  // 서류를 채우는 중. 내가 이어서 써야 한다 — 상품 목록의 '작성 중' 과 같은 색이다
  PREPARING: 'todo',
  SUBMITTED: 'neutral', // 접수됨. 할 일 없음
  REVIEWING: 'progress', // 기관이 심사 중
  APPROVED: 'positive', // 좋은 소식이지만 아직 돈은 안 왔다. 완료보다 한 단계 연하다
  PAID: 'success', // 돈이 오갔다. 마지막 단계라 대표색으로 꽉 채운다
  REJECTED: 'danger',
}

export const SUBMIT_DOCUMENT_STATUS_VARIANT: Record<SubmitDocumentStatus, BadgeVariant> = {
  EMPTY: 'outline', // 아직 올리지 않음
  VALIDATION_READY: 'progress',
  VALIDATING: 'progress',
  PASSED: 'success',
  FAILED: 'danger', // 재업로드가 필요하다
}

export const WRITE_DOCUMENT_STATUS_VARIANT: Record<WriteDocumentStatus, BadgeVariant> = {
  EMPTY: 'outline',
  WRITING: 'progress', // 초안 작성은 서버가 비동기로 한다
  WRITTEN: 'success',
}

export const INSURANCE_STATUS_VARIANT: Record<InsuranceStatus, BadgeVariant> = {
  COMPLETED: 'success',
  NEEDS_VERIFICATION: 'warning', // 가입 여부를 사용자가 확인해줘야 한다
  REQUIRED: 'danger', // 미가입은 과태료 대상이다
  EXEMPT: 'outline', // 업종은 해당되나 이 업체는 대상이 아니다
}

/**
 * 지원사업 값이 대출을 포함하므로(UNKNOWN 만 더 있다) 한 표로 둘 다 덮는다.
 * 색은 도메인이 아니라 "지금 누가 무엇을 해야 하는가" 로 정해져서 갈릴 이유가 없다.
 */
export const PRODUCT_STATUS_VARIANT: Record<SupportStatus, BadgeVariant> = {
  ELIGIBLE: 'ready', // 내가 신청할 수 있다. 지급 완료의 진초록보다 한 단계 연하다
  // 조건을 확인하지 못했을 뿐 신청은 된다. 막는 INELIGIBLE 과 색을 달리한다
  UNKNOWN: 'warning',
  INELIGIBLE: 'danger', // 신청해도 안 되는 상태다. 목록에서 먼저 걸러 보여야 한다
  // 내가 이어서 써야 한다. '확인 필요' 와 같은 주황이지만 테두리라 한눈에 갈린다
  PREPARING: 'todo',
  SUBMITTED: 'neutral',
  REVIEWING: 'progress',
  APPROVED: 'positive', // 선정·승인. 좋은 소식이지만 지급 전이라 연초록이다
  PAID: 'success', // 돈이 오갔다. 마지막 단계라 대표색으로 꽉 채운다
}
