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

/**
 * 되돌릴 수 없는 동작. 여기에는 목이 **덜** 끼어든다.
 *
 * 문제는 `callRealServer` 가 요청을 **이미 보낸 뒤에** 판정한다는 것이다. 응답이
 * 애매하면 목으로 넘기는데, 500 은 "서버가 받아서 실행하다가 터졌다" 일 수 있다.
 * 그러면 실제로는 탈퇴됐는데 목이 다시 200 을 만들어 성공으로 보여준다.
 *
 * 502·503·504 는 게이트웨이가 낸 것이라(백엔드가 안 떠 있으면 vite 프록시가 이걸 준다)
 * 요청이 스프링까지 못 갔다는 뜻이고, 404·405 는 매핑이 없다는 뜻이라 둘 다 안전하다.
 * 그래서 500·501 에서만 목을 막는다 — 안전한 쪽은 그대로 두어 백엔드 없이도 화면이 돈다.
 */
const DESTRUCTIVE = new Set([
  'DELETE /api/v1/user/me',
  'PATCH /api/v1/user/password',
  /*
   * 마이데이터는 지울 것이 없지만 되돌릴 수 없는 건 같다. 판정 1회에 GMS 크레딧이
   * 약 100 나가고, 갱신은 성공하면 쿨다운 시계가 돌아간다. 실서버가 돌다가 500 을
   * 냈는데 목이 200 을 덮어쓰면 "성공했다는데 다음 갱신이 막혀 있는" 상태가 된다.
   */
  'POST /api/v1/mydata/link',
  'POST /api/v1/mydata/refresh',
])

/** 실행됐을 수도 있는 애매한 실패. 되돌릴 수 없는 동작에서는 목으로 넘기지 않는다 */
const MAY_HAVE_RUN = new Set([500, 501])

/**
 * 실서버를 물어보지 않고 **항상 목이 받는** 엔드포인트.
 *
 * 백엔드에 매핑이 없는데도 실서버가 '응답' 해 버리는 경우가 있다.
 * `GlobalExceptionHandler` 가 `ResponseEntityExceptionHandler` 를 상속하지 않고
 * `@ExceptionHandler(Exception.class)` 캐치올을 두고 있어서, 매핑 없는 경로가 던지는
 * `NoResourceFoundException` 까지 잡아 **500 + 공통 봉투**로 만들어 낸다. 아래
 * `callRealServer` 는 봉투가 있으면 백엔드가 낸 응답으로 보므로, 그 500 을 그대로
 * 화면에 넘기고 목은 영영 비켜선다.
 *
 * 그래서 '아직 안 만든 것' 은 물어보지도 않는다. 왕복이 한 번 줄고, 백엔드 로그에
 * 매번 찍히던 ERROR 스택트레이스도 사라진다.
 *
 * ⚠️ **백엔드가 만들면 여기서 지워야 한다.** 다른 엔드포인트처럼 저절로 빠지지 않는다 —
 *    그게 이 목록의 대가다. 그래서 티켓 번호를 같이 적어 둔다.
 */
const MOCK_ONLY = new Set([
  /*
   * 마이페이지 한 화면 분량(사업자 정보·마이데이터·계좌·알림). 백엔드 작업 대기 중이다.
   * 같은 user 도메인이지만 `GET /user/me` 는 구현돼 있어서 여기 없다 — S15P21D101-377
   */
  'GET /api/v1/user/mypage',
  /*
   * 구글 가입자의 이름·생년월일. 백엔드에는 생년월일만 받는 `PATCH /user/birth-date` 가
   * 있고, 이름까지 받는 이 경로는 요청해 둔 상태다. 올라오면 이 줄을 지운다.
   */
  'PATCH /api/v1/user/profile',
])

async function callRealServer(request: Request, destructive: boolean): Promise<Response | null> {
  try {
    const response = await fetch(bypass(request.clone()))

    if (!AMBIGUOUS_STATUS.has(response.status)) return response

    /*
     * 되돌릴 수 없는 동작이 500 을 받았다. 서버가 받아서 실행하다 터진 것일 수 있어
     * 목으로 넘기지 않는다 — 실패로 보여주는 편이 낫다. 성공으로 보여줬다가 실제로는
     * 안 된 경우보다, 실패로 보여줬다가 실제로는 된 경우가 사용자에게 덜 위험하다.
     */
    if (destructive && MAY_HAVE_RUN.has(response.status)) return response

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

    // 물어볼 것도 없이 목이 받는다. 탐지 핸들러를 아예 깔지 않는다
    if (MOCK_ONLY.has(key)) return []

    const destructive = DESTRUCTIVE.has(key)

    return http[httpMethod](path, async ({ request }) => {
      if (implemented.get(key) === false) return undefined

      const response = await callRealServer(request, destructive)

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
