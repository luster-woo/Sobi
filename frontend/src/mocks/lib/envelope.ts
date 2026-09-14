import { HttpResponse } from 'msw'

import type { ApiResponse } from '@/shared/types'

/**
 * 목 응답을 백엔드 공통 봉투(`global/response/ApiResponse.java`)로 감싼다.
 *
 * 손으로 적으면 필드가 빠지거나 `error` 모양이 갈린다 — 실제로 그랬다.
 */

/** `path` 는 화면에서 안 읽는다. 실제 응답과 모양만 맞춘다 */
interface EnvelopeInit {
  path?: string
  status?: number
}

/**
 * 성공 응답. 백엔드는 204 대신 200 + `data: null` 을 쓴다 (로그아웃·완납 상환).
 *
 * 반환 타입이 `Response` 인 이유는 아래 `fail` 주석 참고.
 */
export function ok<T>(
  data: T,
  message = '요청에 성공했습니다.',
  init: EnvelopeInit = {},
): Response {
  const status = init.status ?? 200

  return HttpResponse.json<ApiResponse<T>>(
    {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: init.path ?? '',
      message,
      data,
      error: null,
    },
    { status },
  )
}

/**
 * 실패 응답. `code` 는 `ErrorCode.java` 값을 그대로 쓴다 — 화면이 코드로 분기한다.
 *
 * 에러는 인터셉터가 안 벗기므로 이 모양 그대로 `error.response.data` 에 담긴다.
 *
 * ⚠️ 반환 타입을 `Response` 로 넓힌 이유: `HttpResponse.json<T>` 는 `StrictResponse<T>` 를
 *    준다. 한 핸들러에서 `ok` 와 `fail` 을 같이 return 하면 서로 다른 T 의 union 이 되고,
 *    MSW 가 응답 본문 타입을 하나로 못 정해 에러가 난다. 인자 쪽 타입 검사는 그대로다.
 */
export function fail(status: number, code: string, message: string, path = ''): Response {
  return HttpResponse.json<ApiResponse<null>>(
    {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path,
      message,
      data: null,
      error: { code },
    },
    { status },
  )
}
