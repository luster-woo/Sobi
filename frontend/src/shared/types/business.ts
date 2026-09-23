import type { ID, ISODate, YearMonth } from '@/shared/types/common'

/**
 * 창업자(USER_ROLE.OWNER)의 업체. 추천·보험·세액이 전부 이 id(`business_id`)에 붙는다.
 *
 * 예비 창업자에게는 이 행이 없다. 추천·보험 관련 API 를 부르기 전에 role 을 먼저
 * 확인해야 404 를 피한다.
 */
export interface BusinessInfo {
  id: ID
  userId: ID
  /** minor_code.id (소분류) */
  businessCodeId: ID
  /** 사업자등록번호. 국세청 진위확인(`POST /business/verify`)을 통과한 값 */
  brn: string
  address: string
  /** 지원사업 필터에 쓰는 광역 단위. address 에서 추출한 값 */
  region: string
  employeeCount: number
  openDate: ISODate
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
