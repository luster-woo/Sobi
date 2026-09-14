import { useMutation } from '@tanstack/react-query'

import { login } from '@/features/auth/api/login'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import type { LoginRequest } from '@/shared/types'

/**
 * 로그인 후 스토어를 채운다.
 *
 * 예전에는 로그인 직후 `/user/me` 를 한 번 더 불렀다. 이제 `/auth/login` 응답이
 * 사용자 네 필드를 같이 주므로 호출이 하나로 줄었다 — `/user/me` 는 백엔드에 아직
 * 없어서 그 의존을 끊은 것이 중요하다.
 */
export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession)

  return useMutation({
    mutationFn: (body: LoginRequest) => login(body),
    onSuccess: ({ accessToken, user }) => setSession(accessToken, user),
  })
}
