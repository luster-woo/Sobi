import type { SubmitDocumentStatus, WriteDocumentStatus } from '@/shared/constants/documentStatus'
import type { ProductStatus } from '@/shared/constants/productStatus'
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
  SUBMITTED: 'neutral', // 접수됨. 할 일 없음
  REVIEWING: 'progress', // 기관이 심사 중
  APPROVED: 'success',
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

export const PRODUCT_STATUS_VARIANT: Record<ProductStatus, BadgeVariant> = {
  POSSIBLE: 'success',
  IMPOSSIBLE: 'outline', // 오류가 아니라 자격 미달이라 danger 가 아니다
  WRITING: 'warning', // 사용자가 이어서 작성해야 한다
  SUBMITTED: 'neutral',
  REVIEW: 'progress',
  APPROVED: 'success',
}
