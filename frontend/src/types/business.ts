import type { ID, ISODate, ISODateTime, YearMonth } from '@/types/common'

/**
 * 업체 도메인
 * business_info(창업자) / pre_business_info(예비 창업자) / business_tax / verify
 */

/** business_info — 업체 정보 (창업자) */
export interface BusinessInfo {
  id: ID
  userId: ID
  /** 업종 — minor_code.id (소분류) */
  businessCodeId: ID
  /** 사업자등록번호 */
  brn: string
  address: string
  region: string
  employeeCount: number
  /** 개업년월일 */
  openDate: ISODate
}

/** pre_business_info — 창업 희망 업체 정보 (예비 창업자) */
export interface PreBusinessInfo {
  id: ID
  userId: ID
  /** 희망 업종 — minor_code.id */
  codeId: ID
  /** 창업 희망 지역 */
  region: string
  createdAt: ISODateTime
}

/** business_tax — 업체 매출·세액 (월 단위) */
export interface BusinessTax {
  id: ID
  businessId: ID
  /** 년월, 예: '2026-08' */
  period: YearMonth
  /** 매출 (원) */
  revenue: number
  /** 세액 (원) */
  tax: number
}

/**
 * verify — 국세청 사업자 정보
 *
 * 사업자등록번호 진위확인 API 결과를 그대로 담는 테이블입니다.
 * BusinessInfo 와 컬럼이 겹치지만 출처가 다르므로 별도 타입으로 둡니다.
 */
export interface BusinessVerification {
  id: ID
  /** 사업자 등록번호 */
  brn: string
  /** 대표자명 */
  name: string
  /** 사업자 유형 (예: '개인사업자') */
  type: string
  businessCodeId: ID
  /** 사업장 주소 */
  address: string
  openDate: ISODate
  /** 폐업 여부 */
  isClose: boolean
  employeeCount: number
  region: string
}
