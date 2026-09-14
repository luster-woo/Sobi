export type ID = number
export type ISODate = string // 'YYYY-MM-DD'
export type ISODateTime = string // 'YYYY-MM-DDTHH:mm:ss'
export type YearMonth = string // 'YYYY-MM'

/**
 * 공통 응답 봉투. 모든 엔드포인트가 이 형태로 준다.
 *
 * **성공 응답의 봉투는 `client.ts` 인터셉터가 벗긴다.** api 함수는 알맹이 타입만 쓴다 —
 * `api.get<LoanListData>(...)`. `ApiResponse<T>` 를 제네릭에 넣거나 `data.data` 로 꺼내지 않는다.
 *
 * 직접 쓰는 곳은 `client.ts`(언랩)와 `mocks/lib/envelope.ts`(목 생성) 둘뿐이다.
 *
 * ⚠️ 실패 응답은 안 벗긴다. `errors.ts` 가 봉투째 읽는다.
 */
export interface ApiResponse<T> {
  statusCode: number
  timestamp: ISODateTime
  path: string
  message: string
  data: T
  error: ApiError | null
}

/**
 * 실패 응답의 `error`.
 *
 * 백엔드 `global/response/ErrorResponse.java` 가 `{ code }` 객체를 담는다.
 * API 명세 예시에는 `"error": "INVALID_REQUEST"` 문자열로 적혀 있는데 구현이 다르다 —
 * 구현이 맞다.
 *
 * `code` 는 `global/exception/ErrorCode.java` 의 값이다.
 *   COMMON_001 입력값 검증 실패 · COMMON_002 서버 오류 · U001 없는 사용자
 *   BUSINESS_001 사업자번호 없음 · BUSINESS_002 사업자 정보 불일치
 *   BUSINESS_003 업종 코드 없음 · BUSINESS_O04 등록된 업체 없음
 *
 * ⚠️ BUSINESS_O04 는 숫자 0 이 아니라 영문 O 다. 백엔드 오타이므로 코드로 분기할 때 주의.
 */
export interface ApiError {
  code: string
}

/**
 * 필드 단위 검증 실패.
 *
 * ⚠️ 현재 백엔드는 이걸 내려주지 않는다. `GlobalExceptionHandler` 가 검증 실패를
 *    COMMON_001 하나로 뭉친다. 서버가 필드 목록을 주기 시작하면 `errors.ts` 의
 *    `getFieldErrors` 가 바로 받도록 타입만 남겨둔다.
 */
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
