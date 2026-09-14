import { http } from 'msw'

import { fail, ok } from '@/mocks/lib/envelope'
import type { LoginRequest, SessionUser } from '@/shared/types'
import { USER_ROLE } from '@/shared/types'

/**
 * 목 세션.
 *
 * 실제로는 refreshToken 이 httpOnly 쿠키라 새로고침해도 남는다. 그 지속성이 없으면
 * 세션 복구를 테스트할 수 없어서 sessionStorage 로 흉내낸다.
 *
 * 기본값은 **비로그인**이다. 첫 화면이 랜딩(`/`)이고, 온보딩을 처음부터 눌러보려면
 * 로그인 전 상태여야 한다. 아래 계정으로 실제 로그인하면 보호 라우트가 열린다.
 *
 * 133(인증/온보딩)에서 실제 쿠키 흐름으로 교체한다.
 */
const SESSION_KEY = 'msw:logged-in'
/** 어느 계정으로 로그인했는지. `/user/me` 가 이 값으로 유저를 고른다 */
const SESSION_EMAIL_KEY = 'msw:email'

function hasSession() {
  return sessionStorage.getItem(SESSION_KEY) === 'true'
}

/** 실제 로그인 응답이 주는 네 필드뿐이다 */
const ENTREPRENEUR_USER: SessionUser = {
  userId: 1,
  email: 'owner@sogong.com',
  name: '김소상',
  role: USER_ROLE.ENTREPRENEUR,
}

const PREENTREPRENEUR_USER: SessionUser = {
  userId: 2,
  email: 'pre@sogong.com',
  name: '박예비',
  role: USER_ROLE.PREENTREPRENEUR,
}

/**
 * 목 계정.
 *
 * 비밀번호는 두 계정 모두 `sogong1234!` 다. `validatePassword` 규칙(영문·숫자·특수문자
 * 8자 이상)을 통과하는 값으로 골랐다 — 화면 검증에 먼저 걸리면 로그인 실패를 볼 수 없다.
 */
const MOCK_ACCOUNTS: Record<string, { password: string; user: SessionUser }> = {
  'owner@sogong.com': { password: 'sogong1234!', user: ENTREPRENEUR_USER },
  'pre@sogong.com': { password: 'sogong1234!', user: PREENTREPRENEUR_USER },
}

function currentUser(): SessionUser | null {
  const email = sessionStorage.getItem(SESSION_EMAIL_KEY)
  return email ? (MOCK_ACCOUNTS[email]?.user ?? null) : null
}

/**
 * 백엔드 `JwtProvider` 와 같은 claim 을 담은 가짜 JWT.
 *
 * 세션 복구 폴백이 토큰을 디코드하므로 `sub`·`email`·`role` 이 실제로 들어 있어야
 * 목 환경에서도 그 경로를 검증할 수 있다. 서명은 검증하지 않는다.
 */
function createMockAccessToken(user: SessionUser): string {
  const encode = (value: object) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

  const header = encode({ alg: 'HS256', typ: 'JWT' })
  const payload = encode({
    sub: String(user.userId),
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 1800,
  })

  return `${header}.${payload}.mock-signature`
}

/**
 * 인증 / 계정 (auth) 목 핸들러. 메시지·에러코드는 실제 백엔드 값을 그대로 쓴다.
 *
 * ⚠️ 남은 계약 불일치는 각자 자기 티켓에서 고친다.
 *    - 로그인 응답: `{ accessToken, refreshToken }` → `{ accessToken, tokenType, expiresIn, user }`
 *      (refreshToken 은 실제로는 httpOnly 쿠키라 바디에 없다) — S15P21D101-348
 *    - 이메일 중복확인: `{ available }` → `{ isDuplicate }`, **의미가 반대**다 — S15P21D101-354
 *    - `/user/me` 는 백엔드 미구현이라 목이 유일한 구현이다 — S15P21D101-377
 */
export const authHandlers = [
  // GET /api/v1/auth/email/check?email=
  http.get('/api/v1/auth/email/check', ({ request }) => {
    const email = new URL(request.url).searchParams.get('email')

    return ok({ available: email !== null && !(email in MOCK_ACCOUNTS) }, '이메일 중복 확인 성공', {
      path: '/api/v1/auth/email/check',
    })
  }),

  // POST /api/v1/auth/login
  http.post('/api/v1/auth/login', async ({ request }) => {
    const { email, password } = (await request.json()) as LoginRequest

    const account = MOCK_ACCOUNTS[email]

    // 어느 쪽이 틀렸는지 알려주지 않는다. 가입된 이메일을 알아낼 수 있다
    if (!account || account.password !== password) {
      return fail(
        401,
        'AUTH_009',
        '이메일 또는 비밀번호가 올바르지 않습니다.',
        '/api/v1/auth/login',
      )
    }

    sessionStorage.setItem(SESSION_KEY, 'true')
    sessionStorage.setItem(SESSION_EMAIL_KEY, email)

    /*
     * refreshToken 은 바디에 넣지 않는다 — 실제로는 httpOnly 쿠키다.
     * accessToken 은 세션 복구 폴백(`shared/lib/accessToken.ts`)이 디코드할 수 있게
     * 진짜 JWT 모양으로 만든다. 서명은 아무 값이나 넣는다. 검증은 서버 몫이다.
     */
    return ok(
      {
        accessToken: createMockAccessToken(account.user),
        tokenType: 'Bearer',
        expiresIn: 1800,
        user: account.user,
      },
      '로그인 성공',
      { path: '/api/v1/auth/login' },
    )
  }),

  // POST /api/v1/auth/refresh
  http.post('/api/v1/auth/refresh', () => {
    const user = hasSession() ? currentUser() : null

    if (!user) {
      return fail(401, 'AUTH_008', '만료된 토큰입니다.', '/api/v1/auth/refresh')
    }

    // 실제 응답에는 expiresIn 이 없다. 목도 맞춰둔다
    return ok({ accessToken: createMockAccessToken(user) }, '액세스 토큰 재발급 성공', {
      path: '/api/v1/auth/refresh',
    })
  }),

  // GET /api/v1/user/me — 백엔드 미구현이라 목이 유일한 구현이다
  http.get('/api/v1/user/me', () => {
    const user = hasSession() ? currentUser() : null

    if (!user) {
      return fail(401, 'AUTH_010', '인증이 필요합니다.', '/api/v1/user/me')
    }

    return ok(user, '내 정보 조회 성공', { path: '/api/v1/user/me' })
  }),

  // POST /api/v1/auth/oauth/:provider
  http.post('/api/v1/auth/oauth/:provider', async ({ request, params }) => {
    const { code } = (await request.json()) as { code?: string }
    const path = `/api/v1/auth/oauth/${String(params.provider)}`

    if (params.provider !== 'google') {
      return fail(400, 'AUTH_012', '지원하지 않는 소셜 로그인입니다.', path)
    }

    if (!code) {
      return fail(400, 'AUTH_013', '소셜 로그인 인증에 실패했습니다.', path)
    }

    /*
     * 목은 code 를 검증할 수 없다. 항상 사업자 계정으로 로그인시킨다.
     * 최초 가입 분기(`isNewUser`)를 보려면 code 에 'new' 를 넣어 호출한다 —
     * 실제로는 서버가 정한다.
     */
    const user = ENTREPRENEUR_USER
    sessionStorage.setItem(SESSION_KEY, 'true')
    sessionStorage.setItem(SESSION_EMAIL_KEY, user.email)

    return ok(
      {
        accessToken: createMockAccessToken(user),
        tokenType: 'Bearer',
        expiresIn: 1800,
        user,
        ...(code.includes('new') ? { isNewUser: true } : {}),
      },
      '소셜 로그인 성공',
      { path },
    )
  }),

  /*
   * POST /api/v1/auth/social/:provider — 로컬 → 소셜 전환. 인증 필요.
   *
   * 되돌릴 수 없다. 서버가 provider 를 GOOGLE 로 바꾸고 password 를 지워서
   * 이후로는 구글로만 들어올 수 있다.
   */
  http.post('/api/v1/auth/social/:provider', async ({ request, params }) => {
    const path = `/api/v1/auth/social/${String(params.provider)}`
    const user = hasSession() ? currentUser() : null

    if (!user) return fail(401, 'AUTH_010', '인증이 필요합니다.', path)

    if (params.provider !== 'google') {
      return fail(400, 'AUTH_012', '지원하지 않는 소셜 로그인입니다.', path)
    }

    const { code } = (await request.json()) as { code?: string }
    if (!code) return fail(400, 'AUTH_013', '소셜 로그인 인증에 실패했습니다.', path)

    /*
     * 서버는 구글 이메일이 계정 이메일과 같을 때만 전환한다. 목은 구글에 물어볼 수
     * 없으니 code 에 'mismatch' 가 들어오면 그 케이스로 친다 — 화면 확인용이다.
     */
    if (code.includes('mismatch')) {
      return fail(
        400,
        'AUTH_016',
        '계정 이메일과 일치하는 구글 계정만 연결할 수 있습니다.',
        path,
      )
    }

    return ok(
      { userId: user.userId, email: user.email, provider: 'GOOGLE' },
      '소셜 계정 연결이 완료되었습니다.',
      { path },
    )
  }),

  // POST /api/v1/auth/logout
  http.post('/api/v1/auth/logout', () => {
    sessionStorage.setItem(SESSION_KEY, 'false')
    sessionStorage.removeItem(SESSION_EMAIL_KEY)

    // 백엔드는 204 가 아니라 200 + `data: null` 로 응답한다
    return ok(null, '로그아웃 성공', { path: '/api/v1/auth/logout' })
  }),
]
