import { useMutation } from '@tanstack/react-query'

import { login } from '@/features/auth/api/login'
import { getMe } from '@/features/auth/api/session'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import type { LoginRequest } from '@/shared/types'

/**
 * 로그인 후 스토어를 채운다.
 *
 * `/auth/login` 응답에 유저 정보가 4개 필드만 오거나(명세) 아예 없어서(현재 목),
 * 로그인 직후 `/auth/me` 를 한 번 더 부른다. 그 호출에 토큰이 필요하므로
 * `setAccessToken` 을 먼저 하고 `setSession` 으로 마무리한다.
 */
export function useLogin() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const setSession = useAuthStore((s) => s.setSession)

  return useMutation({
    mutationFn: async (body: LoginRequest) => {
      const { accessToken } = await login(body)
      setAccessToken(accessToken)

      const user = await getMe()
      return { accessToken, user }
    },
    onSuccess: ({ accessToken, user }) => setSession(accessToken, user),
  })
}
