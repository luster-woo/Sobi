export type ID = number
export type ISODate = string // 'YYYY-MM-DD'
export type ISODateTime = string // 'YYYY-MM-DDTHH:mm:ss'
export type YearMonth = string // 'YYYY-MM'

/**
 * 공통 응답 봉투. 모든 엔드포인트가 이 형태로 감싸서 준다.
 *
 * 성공이면 error 가 null 이고 data 에 실제 응답이 들어온다.
 * 실패면 error 에 내용이 담기고 message 에 사람이 읽을 문구가 온다.
 *
 * ⚠️ 아직 client.ts 응답 인터셉터에서 벗기지 않는다. 지금 목 핸들러(auth · business ·
 *    notification)가 봉투 없이 응답해서, 인터셉터를 켜면 그쪽이 전부 깨진다.
 *    각 api 함수에서 `data.data` 로 꺼내 쓰는 중이고, 목을 모두 봉투 형태로 바꾸는
 *    작업과 함께 인터셉터로 옮기는 것이 맞다.
 */
export interface ApiResponse<T> {
  statusCode: number
  timestamp: ISODateTime
  path: string
  message: string
  data: T
  error: string | null
}

/**
 * 에러 응답 바디.
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

/**
 * 페이징 정보. Spring Boot 3.3+ PagedModel 직렬화 형태다.
 *
 * ⚠️ number 는 0-base 다. 화면과 URL 은 1-base 로 쓰므로
 *    `shared/utils/pagination.ts` 의 toUiPage · toServerPage 로 변환한다.
 *
 * 목록 배열의 키는 도메인마다 다르다(`loans`, `programs`). 그래서 제네릭
 * PageResponse<T> 하나로 묶지 않고 각 도메인이 자기 응답 타입을 정의한다.
 *   interface LoanListData { loans: LoanListItem[]; page: PageMeta }
 */
export interface PageMeta {
  number: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

/**
 * 커서 페이징. 알림 목록처럼 무한 스크롤이 필요한 곳에서 쓸 예정이다.
 * ⚠️ 알림 API 가 보류 상태라 실제 응답으로 확인되지 않았다.
 */
export interface CursorResponse<T> {
  content: T[]
  nextCursor: ID | null
  hasNext: boolean
}
