import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'

import { API_BASE_URL, endpoints, NO_REISSUE_PATHS } from '@/shared/api/endpoints'
import { clearAuthState } from '@/shared/lib/clearAuthState'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import { useUiStore } from '@/shared/lib/store/useUiStore'
import type { ApiResponse, TokenResponse } from '@/shared/types'

/** 응답이 이 시간을 넘기면 끊는다. 사용자가 무한 로딩을 보는 것보다 낫다 */
const TIMEOUT_MS = 10_000

/**
 * 앱 전역 HTTP 클라이언트.
 *
 * `withCredentials` 는 refreshToken 쿠키를 보내기 위해 필요하다. 서버가 httpOnly 로
 * 내려주므로 프론트가 값을 읽거나 헤더에 실을 수 없고, 브라우저가 자동으로 붙인다.
 *
 * ⚠️ 이 값이 true 라고 모든 요청에 쿠키가 실리는 것은 아니다. 쿠키를 어디로 보낼지는
 *    쿠키 자신의 `path` 가 정하고, 서버가 `path=/api/v1/auth` 로 굽는다
 *    (`AuthController.createRefreshCookie`). 그래서 대출·신청 같은 요청에는 애초에
 *    실리지 않는다 — 프론트에서 경로별로 끄고 켤 이유가 없다 (S15P21D101-394 점검).
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUT_MS,
  withCredentials: true,
})

/**
 * 재발급 전용 인스턴스.
 *
 * 아래 응답 인터셉터가 401 을 만나면 재발급을 호출한다. 그 호출을 `api` 로 하면
 * 재발급이 401 일 때 인터셉터가 다시 재발급을 부르며 무한 재귀가 된다.
 */
const reissueClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUT_MS,
  withCredentials: true,
})

/**
 * CSRF 표식 (S15P21D101-394).
 *
 * CSRF 공격은 공격자 페이지의 `<form>` 이 우리 API 로 요청을 쏘는 방식인데, 폼은
 * **커스텀 헤더를 붙일 수 없다.** 그래서 이 헤더의 유무가 '우리 JS 가 보낸 요청인가'
 * 를 가르는 표식이 된다.
 *
 * ⚠️ **이 헤더를 붙이는 것만으로는 아무것도 막지 못한다.** 막는 것은 서버의
 *    "이 헤더가 없으면 거부" 검사이고, 프론트는 그 검사를 통과하기 위해 붙일 뿐이다.
 *    백엔드에 검사를 요청해 둔 상태다.
 *
 * 지금 당장 깨질 일은 없다 — 요청이 `/api/v1/...` 상대경로라 브라우저가 같은 출처로
 * 보고 preflight 를 걸지 않는다. 다만 프론트를 다른 호스트의 API 로 붙이게 되면
 * 백엔드 `SecurityConfig` 의 CORS `allowedHeaders` 에 이 이름이 있어야 한다.
 *
 * 참고로 지금도 대부분의 API 는 CSRF 에 면역이다. 인증을 쿠키가 아니라
 * `Authorization` 헤더로 하기 때문이다 — 폼은 그 헤더도 못 붙인다. 쿠키로 인증하는
 * 것은 `/auth/refresh` 하나뿐이고 그쪽은 SameSite=Strict 가 막는다.
 */
const CSRF_HEADER = 'X-Requested-With'

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()

  // 비로그인 상태에서 `Bearer null` 을 보내면 서버가 401 대신 400 을 줄 수 있다
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`

  config.headers[CSRF_HEADER] = 'XMLHttpRequest'

  return config
})

// 재발급도 같은 표식을 단다. 서버가 검사를 켜면 이 경로만 빠져서 401 이 나면 안 된다
reissueClient.interceptors.request.use((config) => {
  config.headers[CSRF_HEADER] = 'XMLHttpRequest'
  return config
})

/**
 * 공통 응답 봉투인지 판별한다.
 *
 * `data` 키만 보면 안 된다. payload 자체가 `data` 필드를 가지면 한 겹 더 벗겨진다.
 */
function isEnvelope(body: unknown): body is ApiResponse<unknown> {
  return (
    typeof body === 'object' &&
    body !== null &&
    'data' in body &&
    'statusCode' in body &&
    'timestamp' in body
  )
}

/** 봉투를 벗겨 `data` 안쪽만 남긴다. 봉투가 아니면(204·파일 등) 그대로 둔다 */
function unwrapEnvelope(response: AxiosResponse): AxiosResponse {
  if (isEnvelope(response.data)) response.data = response.data.data
  return response
}

// 재발급 응답도 봉투다. 안 벗기면 accessToken 을 undefined 로 읽어 세션 복구가 조용히 실패한다
reissueClient.interceptors.response.use(unwrapEnvelope)

/**
 * 진행 중인 재발급 요청.
 *
 * 화면 진입 시 여러 요청이 동시에 401 을 받으면 재발급도 그만큼 호출된다.
 * 서버가 refreshToken 을 회전시키는 구현이면 두 번째 호출부터 이미 폐기된 토큰을
 * 보내게 되어 전부 로그아웃된다. 그래서 첫 요청의 Promise 를 공유한다.
 */
let reissuePromise: Promise<string> | null = null

function reissueAccessToken(): Promise<string> {
  reissuePromise ??= reissueClient
    .post<TokenResponse>(endpoints.auth.refresh)
    .then(({ data }) => {
      useAuthStore.getState().setAccessToken(data.accessToken)
      return data.accessToken
    })
    .finally(() => {
      reissuePromise = null
    })

  return reissuePromise
}

/** 재시도 여부를 config 에 표시해 같은 요청이 두 번 재발급을 부르지 않게 한다 */
interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean
}

/**
 * 호출한 쪽이 손쓸 수 없는 실패만 토스트로 알린다.
 *
 * 4xx 는 띄우지 않는다. 폼 검증 실패나 중복 이메일은 입력 밑에 인라인으로 붙는 게
 * 맞고, 토스트까지 같이 뜨면 중복 안내가 된다. 문구는 `getErrorMessage` 로 뽑는다.
 */
function notifyUnrecoverable(error: AxiosError) {
  // react-query 는 컴포넌트가 언마운트되면 요청을 취소한다. 실패가 아니므로 무시한다
  if (axios.isCancel(error)) return

  const status = error.response?.status

  if (status === undefined) {
    useUiStore.getState().showToast('네트워크 연결을 확인해주세요.', 'danger')
    return
  }

  if (status >= 500) {
    useUiStore
      .getState()
      .showToast('서버에 문제가 생겼습니다. 잠시 후 다시 시도해주세요.', 'danger')
  }
}

// 에러는 안 벗긴다. message 와 error.code 를 둘 다 써야 해서 errors.ts 가 봉투째 읽는다
api.interceptors.response.use(unwrapEnvelope, async (error: AxiosError) => {
  const config = error.config as RetriableConfig | undefined
  const isReissuable =
    error.response?.status === 401 &&
    config !== undefined &&
    !config._retried &&
    !NO_REISSUE_PATHS.includes(config.url ?? '')

  if (!isReissuable) {
    notifyUnrecoverable(error)
    return Promise.reject(error)
  }

  config._retried = true

  try {
    const accessToken = await reissueAccessToken()
    config.headers.Authorization = `Bearer ${accessToken}`
    return await api(config)
  } catch (reissueError) {
    /*
     * 재발급까지 실패하면 세션을 되살릴 방법이 없다. 라우팅은 보호 라우트가 판단한다.
     *
     * ⚠️ `clearSession()` 만 부르면 안 된다. react-query 캐시에 이전 사용자의 응답이
     *    gcTime(5분) 동안 남아, 같은 탭에서 다른 계정으로 들어오면 첫 화면에 스친다.
     *    로그아웃·탈퇴와 같은 정리를 쓴다.
     */
    clearAuthState()
    return Promise.reject(reissueError)
  }
})
