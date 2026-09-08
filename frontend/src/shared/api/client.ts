import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

import { API_BASE_URL, endpoints, NO_REISSUE_PATHS } from '@/shared/api/endpoints'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import { useUiStore } from '@/shared/lib/store/useUiStore'
import type { TokenResponse } from '@/shared/types'

/** 응답이 이 시간을 넘기면 끊는다. 사용자가 무한 로딩을 보는 것보다 낫다 */
const TIMEOUT_MS = 10_000

/**
 * 앱 전역 HTTP 클라이언트.
 *
 * `withCredentials` 는 refreshToken 쿠키를 보내기 위해 필요하다. 서버가 httpOnly 로
 * 내려주므로 프론트가 값을 읽거나 헤더에 실을 수 없고, 브라우저가 자동으로 붙인다.
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

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()

  // 비로그인 상태에서 `Bearer null` 을 보내면 서버가 401 대신 400 을 줄 수 있다
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`

  return config
})

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
    .post<TokenResponse>(endpoints.auth.reissue)
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

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
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
      // 재발급까지 실패하면 세션을 되살릴 방법이 없다. 라우팅은 보호 라우트가 판단한다
      useAuthStore.getState().clearSession()
      return Promise.reject(reissueError)
    }
  },
)
