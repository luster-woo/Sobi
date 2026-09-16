import { ROUTES } from '@/shared/constants/routes'

/**
 * 구글 인가 코드 요청.
 *
 * 흐름은 이렇다.
 *   1. 버튼 → 구글 동의 화면으로 이동 (`buildAuthorizeUrl`)
 *   2. 구글이 `redirectUri` 로 `?code=...&state=...` 를 붙여 돌려보냄
 *   3. 콜백 화면이 state 를 검증하고 의도에 따라 갈라진다
 *      - login → `POST /auth/oauth/google`
 *      - link  → `POST /auth/social/google` (로그인 상태에서만)
 *   4. 서버가 구글에 code 를 교환한다
 *
 * clientId 는 공개값이다. 비밀은 clientSecret 이고 그건 서버만 가진다.
 */
const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

/** 서버가 필요로 하는 최소 범위. 이메일로 계정을 식별한다 */
const SCOPE = 'openid email profile'

/**
 * CSRF 방어용 state 를 보관하는 키.
 *
 * sessionStorage 를 쓴다. 탭을 닫으면 사라지고 다른 탭과 섞이지 않는다.
 * 값 자체는 비밀이 아니라 "내가 시작한 요청인지" 를 확인하는 일회용 표식이다.
 */
const STATE_KEY = 'oauth:state'

/**
 * 무엇을 하려고 구글에 갔는지.
 *
 * 로그인 화면과 마이페이지가 같은 동의 화면을 쓰는데 돌아왔을 때 부를 API 가 다르다.
 * 구글은 우리가 보낸 것만 돌려주므로 출발할 때 기록해 둔다.
 */
const INTENT_KEY = 'oauth:intent'

/**
 * state 를 발급한 시각을 담는 키.
 *
 * 구글 동의 화면까지 갔다 오는 데 몇 분이면 충분한데, 시각을 안 남기면 그 state 가
 * **탭이 열려 있는 내내 유효하다.** 사용자가 동의 화면에서 멈춘 채 탭을 며칠 두면
 * 그 사이 공격자가 확보한 인가 코드를 흘려보낼 창이 그만큼 길어진다.
 */
const ISSUED_AT_KEY = 'oauth:issued-at'

/**
 * state 유효 시간.
 *
 * 동의 화면에서 계정을 고르고 돌아오는 데 5분이면 넉넉하다. 비밀번호를 다시 입력하거나
 * 2단계 인증을 거치는 경우까지 감안해 10분으로 둔다 — 더 짧게 잡으면 정상 사용자가
 * '잘못된 접근이에요' 를 만난다.
 */
const STATE_TTL_MS = 10 * 60 * 1000

export type OAuthIntent = 'login' | 'link'

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

/**
 * 구글 콘솔에 등록된 리디렉션 URI 와 **글자 하나까지 같아야** 한다.
 * 다르면 구글이 redirect_uri_mismatch 로 막는다.
 *
 * 서버도 code 를 교환할 때 같은 값을 쓰므로 `POST /auth/oauth/google` 에 함께 보낸다.
 */
export const GOOGLE_REDIRECT_URI =
  import.meta.env.VITE_GOOGLE_REDIRECT_URI ?? `${window.location.origin}${ROUTES.OAUTH_CALLBACK}`

export function isGoogleOAuthConfigured(): boolean {
  return GOOGLE_CLIENT_ID !== ''
}

function createState(): string {
  return crypto.randomUUID()
}

/**
 * 동의 화면 URL 을 만들고 state 를 저장한다.
 *
 * state 가 없으면 공격자가 자기 인가 코드를 피해자 브라우저로 흘려보내 계정을
 * 바꿔치기할 수 있다(OAuth CSRF). 돌아온 state 가 저장값과 다르면 버린다.
 */
export function buildAuthorizeUrl(intent: OAuthIntent = 'login'): string {
  const state = createState()
  sessionStorage.setItem(STATE_KEY, state)
  sessionStorage.setItem(INTENT_KEY, intent)
  sessionStorage.setItem(ISSUED_AT_KEY, String(Date.now()))

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    state,
    // 계정이 여러 개인 사람이 매번 고를 수 있게 한다
    prompt: 'select_account',
  })

  return `${GOOGLE_AUTHORIZE_URL}?${params.toString()}`
}

/**
 * 돌아온 state 를 검증하고 출발할 때 기록한 의도를 돌려준다.
 * state 가 안 맞으면 null. 성공·실패와 무관하게 저장값은 한 번 쓰고 버린다.
 */
export function consumeOAuthRequest(received: string | null): OAuthIntent | null {
  const saved = sessionStorage.getItem(STATE_KEY)
  const intent = sessionStorage.getItem(INTENT_KEY)
  const issuedAt = Number(sessionStorage.getItem(ISSUED_AT_KEY))

  clearOAuthRequest()

  if (saved === null || received === null || saved !== received) return null

  /*
   * 너무 오래된 요청은 버린다 (S15P21D101-395).
   *
   * 값이 맞아도 발급한 지 오래됐으면 사용자가 그 사이 무엇을 했는지 알 수 없다.
   * `issuedAt` 이 숫자가 아니면(예전 형식·손상) 만료로 본다 — 모르면 막는 쪽이 맞다.
   */
  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > STATE_TTL_MS) return null

  return intent === 'link' ? 'link' : 'login'
}

/**
 * 진행 중이던 OAuth 요청 기록을 버린다.
 *
 * 세션을 정리할 때 같이 불린다(`clearAuthState`). 동의 화면으로 나갔다가 돌아오지 못한
 * 채 로그아웃·만료가 나면 state 가 남는데, 그 값이 살아 있으면 다음 사람이 같은 탭에서
 * 시작한 로그인에 이전 사용자의 의도(`link`)가 섞일 수 있다.
 */
export function clearOAuthRequest() {
  sessionStorage.removeItem(STATE_KEY)
  sessionStorage.removeItem(INTENT_KEY)
  sessionStorage.removeItem(ISSUED_AT_KEY)
}
