import { useMutation } from '@tanstack/react-query'

import { loginWithOAuth } from '@/features/auth/api/oauth'
import { GOOGLE_REDIRECT_URI } from '@/features/auth/model/googleOAuth'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import { AUTH_PROVIDER } from '@/shared/types'

/**
 * 인가 코드를 우리 토큰으로 바꾼다.
 *
 * 응답이 이메일 로그인과 같은 모양이라 세션을 채우는 방식도 같다.
 * `isNewUser` 는 호출한 쪽이 보고 온보딩으로 보낼지 정한다.
 *
 * 가입 경로도 같이 넣는다. 이 경로로 들어온 사람은 소셜 계정이므로 마이페이지에
 * 비밀번호 수정·계정 연결 버튼이 뜨면 안 된다. 로그인 응답에는 provider 가 없어서
 * 여기서 채워준다 (`GET /user/me` 가 붙으면 서버 값으로 대체된다).
 */
export function useOAuthLogin(provider = 'google') {
  const setSession = useAuthStore((s) => s.setSession)
  const setProvider = useAuthStore((s) => s.setProvider)

  return useMutation({
    mutationFn: (code: string) =>
      loginWithOAuth(provider, { code, redirectUri: GOOGLE_REDIRECT_URI }),
    onSuccess: ({ accessToken, user }) => {
      setSession(accessToken, user)
      setProvider(AUTH_PROVIDER.GOOGLE)
    },
  })
}
