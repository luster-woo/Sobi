import { useMutation } from '@tanstack/react-query'

import { linkSocialAccount } from '@/features/auth/api/oauth'
import { GOOGLE_REDIRECT_URI } from '@/features/auth/model/googleOAuth'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import { AUTH_PROVIDER, type AuthProvider } from '@/shared/types'

/** 서버는 'GOOGLE' 문자열을 준다. 모르는 값이면 전환 전으로 둔다 */
function toAuthProvider(value: string): AuthProvider | null {
  return value === AUTH_PROVIDER.GOOGLE ? AUTH_PROVIDER.GOOGLE : null
}

/**
 * 로컬 계정을 소셜로 전환한다. 로그인 상태에서만 부른다.
 *
 * 토큰은 새로 오지 않는다 — 같은 사용자 그대로다. 대신 가입 경로를 스토어에 넣어
 * 마이페이지가 바로 '연결됨' 으로 바뀌게 한다.
 *
 * ⚠️ 되돌릴 수 없다. 서버가 password 를 지워서 이후로는 구글로만 로그인된다.
 */
export function useSocialLink(provider = 'google') {
  const setProvider = useAuthStore((s) => s.setProvider)

  return useMutation({
    mutationFn: (code: string) =>
      linkSocialAccount(provider, { code, redirectUri: GOOGLE_REDIRECT_URI }),
    onSuccess: (response) => {
      const next = toAuthProvider(response.provider)
      if (next) setProvider(next)
    },
  })
}
