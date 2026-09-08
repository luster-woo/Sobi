import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { TokenResponse, User } from '@/shared/types'

/**
 * refreshToken 쿠키로 accessToken 재발급.
 *
 * `/auth/reissue` 는 `NO_REISSUE_PATHS` 에 있어서 401 이 와도 인터셉터가 재발급을
 * 다시 걸지 않는다. 실패는 그대로 던져진다.
 */
export async function reissue() {
  const { data } = await api.post<TokenResponse>(endpoints.auth.reissue)
  return data
}

export async function getMe() {
  const { data } = await api.get<User>(endpoints.auth.me)
  return data
}

/** 로그아웃. 서버가 refreshToken 쿠키를 지운다. 프론트 상태 정리는 `useLogout` 이 한다 */
export async function logout() {
  await api.post(endpoints.auth.logout)
}
