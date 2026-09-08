import type { ID } from '@/shared/types/common'

export interface Insurance {
  id: ID
  name: string
  /** 보험 설명 (VARCHAR(255)) */
  info: string
  /** 가입 조건 원문 (TEXT). 길이 제한이 없어 화면에서 접기 처리가 필요하다 */
  condition: string
}

/**
 * 의무보험은 업체가 아니라 **업종**에 붙는다.
 * 업체의 의무보험 목록은 `business_info.business_code_id` → `code_insurance` 로 찾는다.
 */
export interface CodeInsurance {
  /** minor_code.id */
  codeId: ID
  insuranceId: ID
}

/**
 * ⚠️ ERD 주석에는 한글 값('가입 완료' / '확인 필요' / '가입 필요' / '가입 제외')으로
 *    적혀 있다. 서버 enum 은 영문 상수로 내려준다고 가정했다 — 백엔드 확인 필요.
 *    한글로 확정되면 이 객체의 값만 바꾸면 되고 타입은 그대로 따라간다.
 */
export const INSURANCE_STATUS = {
  ENROLLED: 'ENROLLED', // 가입 완료
  NEEDS_CHECK: 'NEEDS_CHECK', // 확인 필요 — 가입 여부를 판단할 근거가 부족
  NOT_ENROLLED: 'NOT_ENROLLED', // 가입 필요
  EXCLUDED: 'EXCLUDED', // 가입 제외 — 업종은 해당되나 이 업체는 조건 미달
} as const

export type InsuranceStatus = (typeof INSURANCE_STATUS)[keyof typeof INSURANCE_STATUS]

export interface InsuranceChecklist {
  id: ID
  businessId: ID
  insuranceId: ID
  status: InsuranceStatus
}

/** 체크리스트 화면은 보험 정보까지 같이 필요하다. 서버가 조인해 주는 형태를 가정 */
export interface InsuranceChecklistItem extends InsuranceChecklist {
  insurance: Insurance
}
