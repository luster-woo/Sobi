import { http } from 'msw'

import { fail, ok } from '@/mocks/lib/envelope'
import { AUTH_PROVIDER, type User, USER_ROLE } from '@/shared/types'

interface LoginRequest {
  email: string
  password: string
}

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
/** 어느 계정으로 로그인했는지. `/auth/me` 가 이 값으로 유저를 고른다 */
const SESSION_EMAIL_KEY = 'msw:email'

function hasSession() {
  return sessionStorage.getItem(SESSION_KEY) === 'true'
}

const ENTREPRENEUR_USER: User = {
  id: 1,
  email: 'owner@sogong.com',
  name: '김소상',
  role: USER_ROLE.ENTREPRENEUR,
  creditRating: 'AA',
  provider: AUTH_PROVIDER.LOCAL,
  providerId: null,
  notification: true,
  createdAt: '2026-03-02T09:12:00',
  updatedAt: null,
}

const PREENTREPRENEUR_USER: User = {
  id: 2,
  email: 'pre@sogong.com',
  name: '박예비',
  role: USER_ROLE.PREENTREPRENEUR,
  // 마이데이터 연동 전이라 신용등급이 없다
  creditRating: null,
  provider: AUTH_PROVIDER.LOCAL,
  providerId: null,
  notification: true,
  createdAt: '2026-08-14T11:40:00',
  updatedAt: null,
}

/**
 * 목 계정.
 *
 * 비밀번호는 두 계정 모두 `sogong1234!` 다. `validatePassword` 규칙(영문·숫자·특수문자
 * 8자 이상)을 통과하는 값으로 골랐다 — 화면 검증에 먼저 걸리면 로그인 실패를 볼 수 없다.
 */
const MOCK_ACCOUNTS: Record<string, { password: string; user: User }> = {
  'owner@sogong.com': { password: 'sogong1234!', user: ENTREPRENEUR_USER },
  'pre@sogong.com': { password: 'sogong1234!', user: PREENTREPRENEUR_USER },
}

function currentUser(): User | null {
  const email = sessionStorage.getItem(SESSION_EMAIL_KEY)
  return email ? (MOCK_ACCOUNTS[email]?.user ?? null) : null
}

/**
 * 인증 / 계정 (auth) 목 핸들러. 메시지·에러코드는 실제 백엔드 값을 그대로 쓴다.
 *
 * ⚠️ 남은 계약 불일치는 각자 자기 티켓에서 고친다.
 *    - 경로: `/auth/reissue` → `/auth/refresh`, `/auth/me` → `/user/me`
 *    - 로그인 응답: `{ accessToken, refreshToken }` → `{ accessToken, tokenType, expiresIn, user }`
 *      (refreshToken 은 실제로는 httpOnly 쿠키라 바디에 없다)
 *    - 이메일 중복확인: `{ available }` → `{ isDuplicate }` — **의미가 반대**다
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

    return ok(
      { accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token' },
      '로그인 성공',
      { path: '/api/v1/auth/login' },
    )
  }),

  // POST /api/v1/auth/reissue
  http.post('/api/v1/auth/reissue', () => {
    if (!hasSession()) {
      return fail(401, 'AUTH_008', '만료된 토큰입니다.', '/api/v1/auth/reissue')
    }

    return ok({ accessToken: 'mock-access-token', expiresIn: 1800 }, '액세스 토큰 재발급 성공', {
      path: '/api/v1/auth/reissue',
    })
  }),

  // GET /api/v1/auth/me
  http.get('/api/v1/auth/me', () => {
    const user = hasSession() ? currentUser() : null

    if (!user) {
      return fail(401, 'AUTH_010', '인증이 필요합니다.', '/api/v1/auth/me')
    }

    return ok(user, '내 정보 조회 성공', { path: '/api/v1/auth/me' })
  }),

  // POST /api/v1/auth/logout
  http.post('/api/v1/auth/logout', () => {
    sessionStorage.setItem(SESSION_KEY, 'false')
    sessionStorage.removeItem(SESSION_EMAIL_KEY)

    // 백엔드는 204 가 아니라 200 + `data: null` 로 응답한다
    return ok(null, '로그아웃 성공', { path: '/api/v1/auth/logout' })
  }),
]
