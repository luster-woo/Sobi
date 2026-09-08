import type { ID } from '@/shared/types/common'

/**
 * 업종 코드 3단 계층. major_code(대) 1:N sub_code(중) 1:N minor_code(소).
 *
 * 업체·보험이 참조하는 코드 id 는 전부 **소분류(minor_code.id)** 다.
 * `business_info.business_code_id`, `pre_business_info.code_id`,
 * `code_insurance.code_id` 모두 여기를 가리킨다.
 *
 * `code` 는 통계청 표준산업분류 코드(VARCHAR(8))이고 id 와 별개다.
 * 화면 표시·검색은 name, 서버 전송은 id 를 쓴다.
 */
export interface MajorCode {
  id: ID
  code: string
  name: string
}

export interface SubCode {
  id: ID
  majorId: ID
  code: string
  name: string
}

export interface MinorCode {
  id: ID
  subId: ID
  code: string
  name: string
}

/** 업종 선택 UI 에서 3단을 한 번에 다룰 때 쓰는 뷰 타입 (테이블 아님) */
export interface BusinessCategory {
  major: MajorCode
  sub: SubCode
  minor: MinorCode
}
