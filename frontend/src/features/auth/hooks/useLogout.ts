import { useMutation } from '@tanstack/react-query'

import { logout } from '@/features/auth/api/session'
import { ROUTES } from '@/shared/constants/routes'
import { clearAuthState } from '@/shared/lib/clearAuthState'

/**
 * 로그아웃. 서버 호출이 실패해도 세션은 정리한다.
 *
 * 랜딩(`/`)으로 보낸다. 로그인 화면으로 보내면 방금 나간 사람에게 다시 들어오라고
 * 하는 꼴이다.
 *
 * ⚠️ `navigate()` 가 아니라 전체 이동이다. 라우터 안에서 옮기면 가드와 경쟁한다 —
 *    `clearSession()` 으로 상태가 바뀌는 순간 아직 마운트돼 있는 ProtectedRoute 가
 *    `/login` 으로 먼저 보내버리고, 순서를 뒤집으면 이번엔 PublicOnlyRoute 가
 *    아직 로그인 상태로 보고 대시보드로 되돌린다.
 *
 *    전체 이동이면 그 경쟁이 없고, 메모리에 남은 토큰·캐시·스토어가 전부 버려진다.
 *    로그아웃은 그 편이 안전하기도 하다.
 */
export function useLogout() {
  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      // 이동 전에도 지운다. 이동이 막히는 환경에서도 세션은 남지 않아야 한다
      clearAuthState()

      window.location.replace(ROUTES.HOME)
    },
  })
}
