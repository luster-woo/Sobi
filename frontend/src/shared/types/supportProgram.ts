import type { ID, ISODate, ISODateTime } from '@/shared/types/common'

/**
 * 지원 사업. 기업마당(bizinfo) 공공 API 를 수집한 테이블이라 컬럼명이 그쪽
 * 필드명 그대로다. 읽기 어렵지만 서버 응답 키와 어긋나면 매핑 비용이 커져 유지한다.
 *
 * ERD 의 `Field3` / `Field` 는 placeholder 였고, 실제 스키마(`V1__init.sql`)는
 * `start_date` / `end_date` 다.
 */
export interface SupportProgram {
  id: ID
  /** 지원사업명 */
  pblancNm: string
  /** 소관기관명 */
  jrsdInsttNm: string
  /** 수행기관명 */
  excInsttNm: string
  /**
   * 보조금 / 융자 구분 (VARCHAR(10)). 융자성 사업만 interestRate 가 의미 있다.
   * ⚠️ 값의 목록이 스키마에 CHECK 로 걸려 있지 않다 — 백엔드 확인 필요
   */
  type: string
  startDate: ISODate | null
  /** startDate·endDate 가 둘 다 null 이면 '예산 소진 시까지' 를 뜻한다 */
  endDate: ISODate | null
  /** 사업 개요 (VARCHAR(1000)) */
  bsnsSumryCn: string | null
  /** 신청 방법 */
  reqstMthPapersCn: string | null
  /** 문의처 */
  refrncNm: string | null
  /** 사업 신청 URL. 외부 링크라 새 탭으로 연다 */
  rceptEngnHmpgUrl: string | null
  /** 공고문 다운로드 URL */
  printFlpthNm: string | null
  /** 지원 금액 범위. 금액이 공고에 없으면 null */
  minBalance: number | null
  maxBalance: number | null
  /** 융자성 사업의 금리(%). 보조금이면 null */
  interestRate: number | null
}

export const PROGRAM_DOCUMENT_TYPE = {
  SUBMIT: 'SUBMIT', // 제출용 — 발급받아 내는 서류
  WRITE: 'WRITE', // 작성용 — 양식을 내려받아 채우는 서류
} as const

export type ProgramDocumentType = (typeof PROGRAM_DOCUMENT_TYPE)[keyof typeof PROGRAM_DOCUMENT_TYPE]

export interface ProgramDocument {
  id: ID
  supportProgramId: ID
  type: ProgramDocumentType
  /** 문서명. V2 마이그레이션에서 추가됐고 nullable 이다 */
  docName: string | null
  /** 첨부 양식 URL. SUBMIT 은 양식이 없어 null 인 경우가 많다 */
  url: string | null
}

/**
 * ⚠️ ERD 에 id / support_program_id 두 컬럼만 있어 조건 본문 필드가 없다.
 *    지금 상태로는 쓸 수 없는 타입이다 — 컬럼 확정되면 채워야 한다.
 */
export interface ProgramCondition {
  id: ID
  supportProgramId: ID
}

export interface SuggestSupportProgram {
  supportProgramId: ID
  businessId: ID
  createdAt: ISODateTime
  /** 추천 근거. 판정 시 서버가 남긴다 */
  reason: string | null
}

export interface SupportProgramDetail extends SupportProgram {
  documents: ProgramDocument[]
  conditions: ProgramCondition[]
}
