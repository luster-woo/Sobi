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
 * 기본값은 로그인 상태다. 비로그인 흐름(보호 라우트 리다이렉트)을 보려면
 * 브라우저 콘솔에서:
 *   sessionStorage.setItem('msw:logged-in', 'false')
 *
 * 133(인증/온보딩)에서 실제 쿠키 흐름으로 교체한다.
 */
const SESSION_KEY = 'msw:logged-in'

function hasSession() {
  return sessionStorage.getItem(SESSION_KEY) !== 'false'
}

const mockUser: User = {
  id: 1,
  email: 'owner@sogong.com',
  name: '김소상',
  role: USER_ROLE.OWNER,
  phoneNumber: '010-1234-5678',
  creditRating: 'AA',
  provider: AUTH_PROVIDER.LOCAL,
  providerId: null,
  notification: true,
  createdAt: '2026-03-02T09:12:00',
  updatedAt: null,
}

/**
 * 인증 / 계정 (auth) 목 핸들러
 *
 * 응답 형태는 백엔드 명세 확정 전 임시입니다.
 * 공통 응답 포맷이 정해지면 이 파일과 types/ 를 함께 수정해야 합니다.
 */
export const authHandlers = [
  // GET /api/v1/auth/email/check?email=
  http.get('/api/v1/auth/email/check', ({ request }) => {
    const email = new URL(request.url).searchParams.get('email')

    return HttpResponse.json({
      available: email !== 'taken@sogong.com',
    })
  }),

  // POST /api/v1/auth/login
  http.post('/api/v1/auth/login', async ({ request }) => {
    const { email, password } = (await request.json()) as LoginRequest

    if (!email || !password) {
      return HttpResponse.json({ message: '이메일과 비밀번호를 입력해주세요' }, { status: 400 })
    }

    sessionStorage.setItem(SESSION_KEY, 'true')

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
    if (!hasSession()) {
      return HttpResponse.json({ message: '로그인이 필요합니다' }, { status: 401 })
    }

    return HttpResponse.json(mockUser)
  }),

  // POST /api/v1/auth/logout
  http.post('/api/v1/auth/logout', () => {
    sessionStorage.setItem(SESSION_KEY, 'false')
    return new HttpResponse(null, { status: 204 })
  }),
]
