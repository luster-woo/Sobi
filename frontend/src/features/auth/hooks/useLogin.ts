import { useMutation } from '@tanstack/react-query'

import { login } from '@/features/auth/api/login'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import type { LoginRequest } from '@/shared/types'

/**
 * 로그인 후 스토어를 채운다.
 *
 * 예전에는 로그인 직후 `/user/me` 를 한 번 더 불렀다. 이제 `/auth/login` 응답이
 * 사용자 네 필드를 같이 주므로 호출이 하나로 줄었다.
 *
 * 가입 경로는 여기서 넣지 않는다. 로그인 응답에 없고, 필요한 화면(마이페이지)은
 * `GET /user/mypage` 가 주는 값을 본다.
 */
export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession)

  return useMutation({
    mutationFn: (body: LoginRequest) => login(body),
    onSuccess: ({ accessToken, user }) => setSession(accessToken, user),
  })
}
