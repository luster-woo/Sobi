import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { LoginRequest, LoginResponse } from '@/shared/types'

/**
 * 이메일 로그인.
 *
 * 응답에 사용자 정보(네 필드)가 같이 온다. 그래서 로그인 직후 `/user/me` 를 부르지
 * 않는다 — 그 엔드포인트는 백엔드에 아직 없다.
 *
 * refreshToken 은 바디에 없다. 서버가 httpOnly 쿠키로 내려준다.
 */
export async function login(body: LoginRequest) {
  const { data } = await api.post<LoginResponse>(endpoints.auth.login, body)
  return data
}
