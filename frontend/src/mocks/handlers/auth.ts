import { http, HttpResponse } from 'msw'

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
 * 인증 / 계정 (auth) 목 핸들러
 *
 * 응답 형태는 백엔드 명세 확정 전 임시입니다.
 * 공통 응답 포맷(`{ statusCode, timestamp, path, message, data, error }`)이 정해지면
 * 이 파일과 types/ 를 함께 수정해야 합니다.
 */
export const authHandlers = [
  // GET /api/v1/auth/email/check?email=
  http.get('/api/v1/auth/email/check', ({ request }) => {
    const email = new URL(request.url).searchParams.get('email')

    return HttpResponse.json({
      available: email !== null && !(email in MOCK_ACCOUNTS),
    })
  }),

  // POST /api/v1/auth/login
  http.post('/api/v1/auth/login', async ({ request }) => {
    const { email, password } = (await request.json()) as LoginRequest

    const account = MOCK_ACCOUNTS[email]

    // 어느 쪽이 틀렸는지 알려주지 않는다. 가입된 이메일을 알아낼 수 있다
    if (!account || account.password !== password) {
      return HttpResponse.json(
        { message: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 },
      )
    }

    sessionStorage.setItem(SESSION_KEY, 'true')
    sessionStorage.setItem(SESSION_EMAIL_KEY, email)

    return HttpResponse.json({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    })
  }),

  // POST /api/v1/auth/reissue
  http.post('/api/v1/auth/reissue', () => {
    if (!hasSession()) {
      return HttpResponse.json({ message: '만료된 세션입니다' }, { status: 401 })
    }

    return HttpResponse.json({ accessToken: 'mock-access-token', expiresIn: 1800 })
  }),

  // GET /api/v1/auth/me
  http.get('/api/v1/auth/me', () => {
    const user = hasSession() ? currentUser() : null

    if (!user) {
      return HttpResponse.json({ message: '로그인이 필요합니다' }, { status: 401 })
    }

    return HttpResponse.json(user)
  }),

  // POST /api/v1/auth/logout
  http.post('/api/v1/auth/logout', () => {
    sessionStorage.setItem(SESSION_KEY, 'false')
    sessionStorage.removeItem(SESSION_EMAIL_KEY)
    return new HttpResponse(null, { status: 204 })
  }),
]
