import { http, HttpResponse } from 'msw'

interface LoginRequest {
  email: string
  password: string
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

    return HttpResponse.json({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    })
  }),
]
