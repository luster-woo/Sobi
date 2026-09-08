import type { ID, ISODate, ISODateTime, YearMonth } from '@/shared/types/common'

/**
 * 창업자(USER_ROLE.OWNER)의 업체. 추천·보험·세액이 전부 이 id(`business_id`)에 붙는다.
 *
 * 예비 창업자는 이 테이블이 아니라 `PreBusinessInfo` 를 쓰므로, 추천 관련 API 를
 * 호출할 때 role 을 먼저 확인해야 한다.
 */
export interface BusinessInfo {
  id: ID
  userId: ID
  /** minor_code.id (소분류) */
  businessCodeId: ID
  /** 사업자등록번호. 국세청 진위확인(`BusinessVerification`)을 통과한 값 */
  brn: string
  address: string
  /** 지원사업 필터에 쓰는 광역 단위. address 에서 추출한 값 */
  region: string
  employeeCount: number
  openDate: ISODate
}

/**
 * 예비 창업자의 창업 희망 정보.
 *
 * 사업자등록 전이라 brn·employeeCount·openDate 가 없고 희망 업종·지역만 받는다.
 * 그래서 이 유저에게는 보험 체크리스트·매출 세액 기능을 쓸 수 없다.
 */
export interface PreBusinessInfo {
  id: ID
  userId: ID
  /** minor_code.id */
  codeId: ID
  region: string
  createdAt: ISODateTime
}

/** 월 단위 매출·세액. 같은 businessId + period 조합은 하나만 존재한다 */
export interface BusinessTax {
  id: ID
  businessId: ID
  period: YearMonth
  /** 원 단위 */
  revenue: number
  /** 원 단위 */
  tax: number
}

/**
 * 국세청 사업자 진위확인 결과(`verify`).
 *
 * `BusinessInfo` 와 컬럼이 겹치지만 이쪽은 국세청 API 응답 원본이다.
 * 업체 등록 폼에서 사업자등록번호를 조회해 자동 채움용으로 쓰고,
 * 사용자가 확인한 값이 `BusinessInfo` 로 저장된다.
 */
export interface BusinessVerification {
  id: ID
  brn: string
  /** 대표자명 */
  name: string
  /** 사업자 유형 (예: '개인사업자') */
  type: string
  businessCodeId: ID
  address: string
  openDate: ISODate
  /** 폐업 사업자면 업체 등록을 막아야 한다 */
  isClose: boolean
  employeeCount: number
  region: string
}
