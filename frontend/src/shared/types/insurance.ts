import type { ID } from '@/shared/types/common'

/**
 * `V10__add_category_to_insurance.sql` 의 `CHECK (category IN ('SOCIAL','MANDATORY'))`.
 *
 * SOCIAL 은 4대 사회보험이라 업종과 무관하게 모든 업체의 체크리스트에 들어가고,
 * MANDATORY 는 `code_insurance` 매핑을 타 업종이 걸린 업체에만 들어간다.
 */
export const INSURANCE_CATEGORY = {
  SOCIAL: 'SOCIAL', // 4대 사회보험
  MANDATORY: 'MANDATORY', // 업종별 의무보험
} as const

export type InsuranceCategory = (typeof INSURANCE_CATEGORY)[keyof typeof INSURANCE_CATEGORY]

export interface Insurance {
  id: ID
  name: string
  /** 보험 설명 (VARCHAR(255)) */
  info: string
  /** 가입 조건 원문 (TEXT). 길이 제한이 없어 화면에서 접기 처리가 필요하다 */
  condition: string
  category: InsuranceCategory
}

/**
 * `V1__init.sql` 의 `chk_insurance_checklist_status` 제약값이다.
 *   CHECK (status IN ('COMPLETED', 'NEEDS_VERIFICATION', 'REQUIRED', 'EXEMPT'))
 */
export const INSURANCE_STATUS = {
  COMPLETED: 'COMPLETED', // 가입 완료
  NEEDS_VERIFICATION: 'NEEDS_VERIFICATION', // 확인 필요 — 가입 여부를 판단할 근거가 부족
  REQUIRED: 'REQUIRED', // 가입 필요
  EXEMPT: 'EXEMPT', // 가입 제외 — 업종은 해당되나 이 업체는 조건 미달
} as const

export type InsuranceStatus = (typeof INSURANCE_STATUS)[keyof typeof INSURANCE_STATUS]

export interface InsuranceChecklist {
  id: ID
  businessId: ID
  insuranceId: ID
  status: InsuranceStatus
}
