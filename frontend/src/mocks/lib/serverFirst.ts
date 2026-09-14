import { bypass, http, type HttpHandler } from 'msw'

/**
 * 실서버를 먼저 때려보고, 아직 없는 엔드포인트만 목이 받게 한다.
 *
 * 목 핸들러 앞에 같은 경로의 "탐지 핸들러"를 깔아두는 방식이다. 탐지 핸들러가
 * `undefined` 를 반환하면 MSW 가 다음 핸들러(= 원래 목)로 넘긴다.
 *
 * 덕분에 백엔드가 엔드포인트를 구현하는 순간 목에서 **엔드포인트 단위로** 자동으로
 * 빠진다. 도메인 단위가 아니라 엔드포인트 단위인 게 중요하다 — 예를 들어 auth 는
 * 다 구현됐지만 같은 파일에 있는 `/user/me` 는 아직 없다.
 */

/** 판정 결과를 경로별로 기억한다. 없으면 매 요청마다 왕복이 한 번 더 생긴다 */
const implemented = new Map<string, boolean>()

/**
 * 실서버 응답을 쓸 수 있으면 그대로 돌려주고, 못 쓰면 null.
 *
 * 같은 상태 코드가 두 가지 뜻으로 온다.
 *   404  스프링 매핑 없음(미구현)  vs  업무 404(BUSINESS_O04 등)
 *   502  Vite 프록시가 8080 에 못 붙음  vs  백엔드가 진짜 낸 502
 *   500  프록시·게이트웨이 오류      vs  백엔드 COMMON_002
 *
 * 전부 본문으로 가른다. 백엔드가 낸 응답이면 공통 봉투(`statusCode`·`timestamp`)가
 * 있고, 프록시·게이트웨이가 낸 것이면 없다. 봉투가 없으면 목이 받는다.
 *
 * 200·400·401 은 확인할 것도 없이 백엔드가 응답한 것이다.
 */
const AMBIGUOUS_STATUS = new Set([404, 405, 500, 501, 502, 503, 504])

async function callRealServer(request: Request): Promise<Response | null> {
  try {
    const response = await fetch(bypass(request.clone()))

    if (!AMBIGUOUS_STATUS.has(response.status)) return response

    const body: unknown = await response
      .clone()
      .json()
      .catch(() => null)

    const fromBackend =
      typeof body === 'object' && body !== null && 'statusCode' in body && 'timestamp' in body

    return fromBackend ? response : null
  } catch {
    // 서버가 안 떠 있거나 프록시가 못 붙는다
    return null
  }
}

type HttpMethod = keyof typeof http

/** `info.method` 는 문자열일 수도 정규식일 수도 있다. 문자열만 다룬다 */
function toHttpMethod(method: string | RegExp): HttpMethod | null {
  if (typeof method !== 'string') return null

  const lowered = method.toLowerCase()
  return lowered in http ? (lowered as HttpMethod) : null
}

/**
 * 목 핸들러 목록 앞에 깔 탐지 핸들러를 만든다.
 *
 * 경로나 메서드가 정규식인 핸들러는 건너뛴다 — 같은 조건으로 탐지 핸들러를 다시
 * 만들 수 없다. 현재 우리 핸들러는 전부 문자열이다.
 */
export function createServerFirstProbes(handlers: HttpHandler[]): HttpHandler[] {
  return handlers.flatMap((handler) => {
    const { method, path } = handler.info
    if (typeof path !== 'string' || typeof method !== 'string') return []

    const httpMethod = toHttpMethod(method)
    if (httpMethod === null) return []

    const key = `${method} ${path}`

    return http[httpMethod](path, async ({ request }) => {
      if (implemented.get(key) === false) return undefined

      const response = await callRealServer(request)

      if (response === null) {
        if (!implemented.has(key)) {
          console.info(`[MSW] ${key} — 백엔드 응답 없음(미구현·미기동), 목으로 응답합니다`)
          implemented.set(key, false)
        }
        // undefined 를 주면 MSW 가 다음 핸들러(목)로 넘긴다
        return undefined
      }

      if (implemented.get(key) !== true) {
        console.info(`[MSW] ${key} — 실서버 응답 사용`)
        implemented.set(key, true)
      }

      return response
    })
  })
}
