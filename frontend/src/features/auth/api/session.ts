import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { TokenResponse, User } from '@/shared/types'

/**
 * refreshToken 쿠키로 accessToken 재발급.
 *
 * `/auth/refresh` 는 `NO_REISSUE_PATHS` 에 있어서 401 이 와도 인터셉터가 재발급을
 * 다시 걸지 않는다. 실패는 그대로 던져진다.
 *
 * ⚠️ 백엔드 응답에 `expiresIn` 이 없다(로그인 응답에만 있다). 선제 재발급 타이머는
 *    못 만들고 401 기반으로만 돈다 — BE-05.
 */
export async function reissue() {
  const { data } = await api.post<TokenResponse>(endpoints.auth.refresh)
  return data
}

/** ⚠️ 백엔드 `GET /user/me` 미구현. 지금은 MSW 만 응답한다 (S15P21D101-377) */
export async function getMe() {
  const { data } = await api.get<User>(endpoints.user.me)
  return data
}

/** 로그아웃. 서버가 refreshToken 쿠키를 지운다. 프론트 상태 정리는 `useLogout` 이 한다 */
export async function logout() {
  await api.post(endpoints.auth.logout)
}
