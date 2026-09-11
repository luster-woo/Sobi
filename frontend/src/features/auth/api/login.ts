import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { LoginRequest } from '@/shared/types'

/**
 * ⚠️ 응답 형태가 명세와 다르다. 명세는 봉투 안에
 *    `{ accessToken, tokenType, expiresIn, user }` 를 주는데 지금 MSW 핸들러는
 *    `{ accessToken, refreshToken }` 을 그대로 준다. 계약 정렬 때 이 함수만 고치면
 *    화면과 훅은 그대로 간다.
 */
interface LoginResult {
  accessToken: string
}

export async function login(body: LoginRequest) {
  const { data } = await api.post<LoginResult>(endpoints.auth.login, body)
  return data
}
