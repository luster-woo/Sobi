import type { ID, ISODate, ISODateTime } from '@/types/common'

/**
 * 지원 사업 도메인
 * support_program / program_document / program_condition / suggest_support_program
 *
 * 컬럼명이 기업마당(bizinfo) 공공 API 필드명을 그대로 따르고 있어
 * 읽기 어렵지만, 서버 응답 키와 어긋나면 매핑 비용이 커지므로 그대로 유지합니다.
 */

/** support_program — 지원 사업 */
export interface SupportProgram {
  id: ID
  /** 지원사업 명 */
  pblancNm: string
  /** 소관기관명 */
  jrsdInsttNm: string
  /** 수행기관명 */
  excInsttNm: string
  /**
   * 시작일. ERD 컬럼명은 `Field3` 이지만 placeholder 로 판단해 startDate 로 명명했습니다.
   * 시작·마감이 둘 다 null 이면 '예산 소진 시까지' 를 의미합니다.
   */
  startDate: ISODate | null
  /** 마감일. ERD 컬럼명 `Field` */
  endDate: ISODate | null
  /** 사업 개요 내용 */
  bsnsSumryCn: string | null
  /** 신청 방법 */
  reqstMthPapersCn: string | null
  /** 문의처 */
  refrncNm: string | null
  /** 사업 신청 URL */
  rceptEngnHmpgUrl: string | null
  /** 공고 다운로드 URL */
  printFlpthNm: string | null
}

/** program_document.type — 제출용 / 작성용 */
export const PROGRAM_DOCUMENT_TYPE = {
  /** 제출용 — 지원자가 발급받아 제출하는 서류 */
  SUBMIT: 'SUBMIT',
  /** 작성용 — 양식을 내려받아 작성하는 서류 */
  WRITE: 'WRITE',
} as const

export type ProgramDocumentType = (typeof PROGRAM_DOCUMENT_TYPE)[keyof typeof PROGRAM_DOCUMENT_TYPE]

/** program_document — 지원 사업 필요 서류 */
export interface ProgramDocument {
  id: ID
  supportProgramId: ID
  type: ProgramDocumentType
  /** 첨부파일 URL. 제출용 서류는 양식이 없어 null 일 수 있습니다. */
  url: string | null
}

/**
 * program_condition — 지원 사업 조건
 *
 * ERD 에 id / support_program_id 두 컬럼만 정의돼 있어 조건 본문 필드가 없습니다.
 * 컬럼 확정 후 이 타입을 채워야 합니다.
 */
export interface ProgramCondition {
  id: ID
  supportProgramId: ID
}

/** suggest_support_program — 업체별 추천 지원사업 */
export interface SuggestSupportProgram {
  supportProgramId: ID
  businessId: ID
  createdAt: ISODateTime
}

/** 상세 화면용 — 사업 + 필요 서류 + 조건 */
export interface SupportProgramDetail extends SupportProgram {
  documents: ProgramDocument[]
  conditions: ProgramCondition[]
}
