import { useQuery } from '@tanstack/react-query'

import { getMe, reissue } from '@/features/auth/api/session'
import { queryKeys } from '@/shared/api/queryKeys'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'

/**
 * 스토어를 직접 채운다.
 *
 * 이 쿼리는 데이터를 화면에 그리려고 있는 게 아니라 authStore 를 채우려고 있으므로,
 * 결과를 useEffect 로 한 번 더 옮기지 않는다.
 */
async function restoreSession() {
  try {
    const { accessToken } = await reissue()
    const user = await getMe()

    useAuthStore.getState().setSession(accessToken, user)
    return user
  } catch (error) {
    // 비로그인 방문자도 여기로 온다. 실패가 아니라 '로그인 안 된 상태' 로 확정한다
    useAuthStore.getState().clearSession()
    throw error
  }
}

/**
 * 앱 진입 시 세션 복구. `RootLayout` 에서 한 번 호출한다.
 *
 * accessToken 을 메모리에만 두므로 새로고침하면 사라진다. refreshToken 쿠키로
 * 토큰을 다시 받고 본인 정보를 조회해 스토어를 채운다.
 *
 * useEffect 대신 useQuery 를 쓴 이유는 중복 호출 때문이다. StrictMode 는 effect 를
 * 두 번 실행하는데, 서버가 refreshToken 을 회전시키는 구현이면 두 번째 요청이 이미
 * 폐기된 토큰을 보내 로그아웃된다. react-query 는 같은 키의 동시 요청을 합쳐준다.
 */
export function useSession() {
  const status = useAuthStore((s) => s.status)

  useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: restoreSession,
    // 성공이든 실패든 status 가 바뀌므로 복구는 한 번만 시도된다
    enabled: status === 'loading',
    retry: false,
    staleTime: Infinity,
  })

  return status
}
