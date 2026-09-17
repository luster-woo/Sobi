import { useMutation } from '@tanstack/react-query'

import { loginWithOAuth } from '@/features/auth/api/oauth'
import { GOOGLE_REDIRECT_URI } from '@/features/auth/model/googleOAuth'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'

/**
 * 인가 코드를 우리 토큰으로 바꾼다.
 *
 * 응답이 이메일 로그인과 같은 모양이라 세션을 채우는 방식도 같다.
 * `isNewUser` 는 호출한 쪽이 보고 온보딩으로 보낼지 정한다.
 *
 * 가입 경로는 여기서 넣지 않는다. 마이페이지가 `GET /user/mypage` 의 값을 보므로
 * 로그인 경로로 추측할 필요가 없다 — 추측해서 넣으면 새로고침 후와 값이 갈린다.
 */
export function useOAuthLogin(provider = 'google') {
  const setSession = useAuthStore((s) => s.setSession)

  return useMutation({
    mutationFn: (code: string) =>
      loginWithOAuth(provider, { code, redirectUri: GOOGLE_REDIRECT_URI }),
    onSuccess: ({ accessToken, user }) => setSession(accessToken, user),
  })
}
