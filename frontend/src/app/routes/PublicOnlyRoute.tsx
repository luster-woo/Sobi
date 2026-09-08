import { Navigate, Outlet } from 'react-router'

import { RouteFallback } from '@/app/routes/RouteFallback'
import { ROUTES } from '@/shared/constants/routes'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'

/**
 * 로그인 상태에서는 들어갈 이유가 없는 라우트(로그인·회원가입)를 감싼다.
 * 복구 중에 통과시키면 이미 로그인된 사용자에게 로그인 폼이 잠깐 보인다.
 */
export function PublicOnlyRoute() {
  const status = useAuthStore((s) => s.status)

  if (status === 'loading') return <RouteFallback />
  if (status === 'authenticated') return <Navigate to={ROUTES.DASHBOARD} replace />

  return <Outlet />
}
