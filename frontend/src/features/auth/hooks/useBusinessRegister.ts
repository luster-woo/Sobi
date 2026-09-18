import { useMutation, useQueryClient } from '@tanstack/react-query'

import { registerBusiness } from '@/features/auth/api/businessVerify'
import { reissue } from '@/features/auth/api/session'
import { queryKeys } from '@/shared/api/queryKeys'
import { sessionUserFromToken } from '@/shared/lib/accessToken'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'

/**
 * 업체 등록.
 *
 * 등록만으로는 화면이 바뀌지 않는다. 서버가 `user.role` 을 ENTREPRENEUR 로 바꾸지만
 * 손에 든 accessToken 은 발급 시점의 role(PREENTREPRENEUR)을 그대로 담고
 * 있어서, 사이드바 카드도 대시보드도 여전히 예비 창업자로 본다. 그래서 등록 직후
 * 재발급을 한 번 태워 새 role 이 담긴 토큰으로 갈아끼운다.
 *
 * 재발급이 실패해도 등록 자체는 성공이다. 되돌릴 방법이 없고 다음 요청이 401 을
 * 받으면 인터셉터가 알아서 재발급하므로, 여기서는 삼키고 넘어간다.
 */
export function useBusinessRegister() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (brn: string) => {
      await registerBusiness(brn)

      try {
        const { accessToken } = await reissue()
        const { user, setAccessToken, setUser } = useAuthStore.getState()

        setAccessToken(accessToken)

        /*
         * role 만 옮긴다. `sessionUserFromToken` 은 claim 에 `name` 이 없어 이메일
         * 앞부분으로 이름을 지어내므로, 통째로 덮으면 상단바 이름이 '박예비' 에서
         * 'pre' 로 바뀐다.
         */
        const refreshed = sessionUserFromToken(accessToken)
        if (user && refreshed) setUser({ ...user, role: refreshed.role })
      } catch {
        console.warn('[business] 등록은 됐지만 토큰 재발급에 실패했습니다.')
      }
    },
    onSuccess: () => {
      // 등록 전에 404 로 굳은 캐시가 남아 있으면 사이드바가 계속 '업체 등록하기' 다
      void queryClient.invalidateQueries({ queryKey: queryKeys.business.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}
