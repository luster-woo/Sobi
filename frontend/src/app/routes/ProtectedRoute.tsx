import { Navigate, Outlet, useLocation } from 'react-router'

import { RouteFallback } from '@/app/routes/RouteFallback'
import { ROUTES } from '@/shared/constants/routes'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'

/** 로그인이 필요한 라우트를 감싼다 */
export function ProtectedRoute() {
  const status = useAuthStore((s) => s.status)
  const location = useLocation()

  // 복구가 끝나기 전에 판단하면 새로고침할 때마다 로그인 화면으로 튕긴다
  if (status === 'loading') return <RouteFallback />

  if (status === 'unauthenticated') {
    // 로그인 후 원래 가려던 곳으로 되돌리려고 위치를 넘긴다. 받는 쪽은 LoginPage.
    // replace 가 없으면 뒤로가기가 다시 보호된 경로로 들어가 무한 왕복이 된다.
    return <Navigate to={ROUTES.LOGIN} replace state={{ from: location }} />
  }

  return <Outlet />
}
