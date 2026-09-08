export type ID = number
export type ISODate = string // 'YYYY-MM-DD'
export type ISODateTime = string // 'YYYY-MM-DDTHH:mm:ss'
export type YearMonth = string // 'YYYY-MM'

/**
 * 에러 응답 바디.
 *
 * 백엔드 공통 응답 포맷이 아직 없다. 현재 MSW 핸들러(`mocks/handlers/auth.ts`)가
 * `{ message }` 만 반환하므로 message 외에는 optional 로 뒀다.
 * 성공 응답도 봉투 없이 데이터를 그대로 준다고 가정한다 — 포맷이 확정되면
 * `shared/api/client.ts` 의 응답 인터셉터에서 봉투를 벗기고 이 타입을 조정해야 한다.
 */
export interface ApiErrorBody {
  message: string
  code?: string
  errors?: FieldError[]
}

export interface FieldError {
  field: string
  message: string
}

/** Spring Data `Page` 응답에서 화면에 쓰는 필드만 추렸다 */
export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

export interface CursorResponse<T> {
  content: T[]
  nextCursor: ID | null
  hasNext: boolean
}
