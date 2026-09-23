import { useMutation, useQueryClient } from '@tanstack/react-query'

import { linkSocialAccount } from '@/features/auth/api/oauth'
import { GOOGLE_REDIRECT_URI } from '@/features/auth/model/googleOAuth'
import { queryKeys } from '@/shared/api/queryKeys'

/**
 * 로컬 계정을 소셜로 전환한다. 로그인 상태에서만 부른다.
 *
 * 토큰은 새로 오지 않는다 — 같은 사용자 그대로다. 가입 경로는 서버가 들고 있고
 * `GET /user/mypage` 가 실어 주므로, 전환이 끝나면 그 조회를 무효화해 화면이
 * '연결됨' 으로 바뀌게 한다.
 *
 * ⚠️ 응답의 `provider` 를 화면 상태에 직접 넣지 않는다. 그렇게 하면 전환 직후에만
 *    맞고 새로고침하면 서버 값으로 되돌아가, 목에서 백엔드 버그를 못 보고 넘어간다.
 *
 * ⚠️ 되돌릴 수 없다. 서버가 password 를 지워서 이후로는 구글로만 로그인된다.
 */
export function useSocialLink(provider = 'google') {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (code: string) =>
      linkSocialAccount(provider, { code, redirectUri: GOOGLE_REDIRECT_URI }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.user.all })
    },
  })
}
