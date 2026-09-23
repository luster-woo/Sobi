import { Navigate, Outlet } from 'react-router'

import { RouteFallback } from '@/app/routes/RouteFallback'
import { ROUTES } from '@/shared/constants/routes'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'

/**
 * 로그인 상태에서는 들어갈 이유가 없는 라우트(로그인·회원가입)를 감싼다.
 * 복구 중에 통과시키면 이미 로그인된 사용자에게 로그인 폼이 잠깐 보인다.
 *
 * 로그인되면 대시보드로 보내는 게 기본이고, 가입 흐름처럼 갈 곳이 따로 정해진 경우에만
 * `postAuthRedirect` 가 그 자리를 대신한다. 이동을 여기 한 곳에서만 일으키려고
 * 이렇게 뒀다 — 화면에서 `navigate` 를 같이 부르면 둘이 경합해서 어느 쪽이 이길지
 * 모른다 (스토어의 `postAuthRedirect` 주석 참고).
 */
export function PublicOnlyRoute() {
  const status = useAuthStore((s) => s.status)
  const postAuthRedirect = useAuthStore((s) => s.postAuthRedirect)

  if (status === 'loading') return <RouteFallback />

  if (status === 'authenticated') {
    return <Navigate to={postAuthRedirect ?? ROUTES.DASHBOARD} replace />
  }

  return <Outlet />
}
