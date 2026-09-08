import type { ID } from '@/types/common'

/**
 * 의무 보험 도메인
 * insurance / code_insurance(업종별 의무보험 매핑) / insurance_checklist(업체별 가입 여부)
 */

/** insurance — 의무 보험 */
export interface Insurance {
  id: ID
  /** 의무보험 이름 */
  name: string
  /** 보험 설명 */
  info: string
  /** 보험 조건 (TEXT) */
  condition: string
}

/** code_insurance — 업종 코드 ↔ 의무 보험 매핑 */
export interface CodeInsurance {
  /** minor_code.id */
  codeId: ID
  insuranceId: ID
}

/**
 * insurance_checklist.status
 *
 * ERD 주석에는 한글 값(가입 완료 / 확인 필요 / 가입 필요 / 가입 제외)으로 적혀 있으나
 * 서버 enum 은 영문 상수로 내려주는 것으로 가정했습니다.
 * → 백엔드와 값 확정 필요 (docs/frontend-architecture-notes.md 참고)
 */
export const INSURANCE_STATUS = {
  /** 가입 완료 */
  ENROLLED: 'ENROLLED',
  /** 확인 필요 */
  NEEDS_CHECK: 'NEEDS_CHECK',
  /** 가입 필요 */
  NOT_ENROLLED: 'NOT_ENROLLED',
  /** 가입 제외 */
  EXCLUDED: 'EXCLUDED',
} as const

export type InsuranceStatus = (typeof INSURANCE_STATUS)[keyof typeof INSURANCE_STATUS]

/** insurance_checklist — 업체별 보험 가입 여부 */
export interface InsuranceChecklist {
  id: ID
  businessId: ID
  insuranceId: ID
  status: InsuranceStatus
}

/** 체크리스트 화면에서 보험 정보까지 합쳐 쓰는 뷰 타입 */
export interface InsuranceChecklistItem extends InsuranceChecklist {
  insurance: Insurance
}
