import type { ID } from '@/types/common'

/**
 * 업종 분류 코드 — 대 / 중 / 소 3단 계층
 * major_code ─1:N─ sub_code ─1:N─ minor_code
 *
 * 업체 정보가 참조하는 `businessCodeId` 는 소분류(minor_code) 의 id 입니다.
 */

/** major_code — 업종 분류 코드 (대) */
export interface MajorCode {
  id: ID
  /** 업종 코드 (VARCHAR(8)) */
  code: string
  /** 업종명 */
  name: string
}

/** sub_code — 업종 분류 코드 (중) */
export interface SubCode {
  id: ID
  /** 상위 대분류 id */
  majorId: ID
  code: string
  name: string
}

/** minor_code — 업종 분류 코드 (소) */
export interface MinorCode {
  id: ID
  /** 상위 중분류 id */
  subId: ID
  code: string
  name: string
}

/** 업종 선택 UI 에서 3단 계층을 한 번에 다룰 때 쓰는 뷰 타입 */
export interface BusinessCategory {
  major: MajorCode
  sub: SubCode
  minor: MinorCode
}
