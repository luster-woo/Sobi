/**
 * 프로젝트 전역 공용 타입
 *
 * ERD 매핑 규칙 (모든 도메인 타입 공통)
 *   BIGINT / INT      → number
 *   VARCHAR / TEXT    → string
 *   BOOLEAN           → boolean
 *   TIMESTAMP         → string (ISODateTime)
 *   DATE              → string (ISODate)
 *   NULL 허용 컬럼    → `| null` (optional `?` 아님 — 서버가 키를 항상 보내므로)
 *
 * 컬럼명은 snake_case → camelCase 로 바꿔 씁니다. (Spring Jackson 기본 직렬화)
 */

/** 서버 PK. ERD 상 BIGINT 지만 JS number 안전범위(2^53) 내로 가정합니다. */
export type ID = number

/** 'YYYY-MM-DD' */
export type ISODate = string

/** 'YYYY-MM-DDTHH:mm:ss' */
export type ISODateTime = string

/** 'YYYY-MM' — business_tax.period 형식 */
export type YearMonth = string

/**
 * 에러 응답 바디.
 *
 * 백엔드 공통 응답 포맷이 확정되기 전 임시 형태입니다.
 * 현재 MSW 핸들러가 `{ message }` 만 돌려주므로 message 외에는 optional 로 둡니다.
 */
export interface ApiErrorBody {
  message: string
  /** 백엔드 에러 코드 (예: 'AUTH_001'). 포맷 확정 후 필수로 바꿉니다. */
  code?: string
  /** 필드 단위 검증 실패 상세 */
  errors?: FieldError[]
}

export interface FieldError {
  field: string
  message: string
}

/** Spring Data Pageable 응답에서 화면에 필요한 부분만 추린 형태 */
export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

/** 커서 기반 목록 (알림 등 무한스크롤용) */
export interface CursorResponse<T> {
  content: T[]
  nextCursor: ID | null
  hasNext: boolean
}
