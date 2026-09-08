import { Outlet } from 'react-router'

import { useSession } from '@/features/auth/hooks/useSession'

/**
 * 모든 라우트의 부모. 여기서 세션 복구를 시작한다.
 * 헤더·푸터 등 골격은 110(공통 레이아웃)에서 채운다.
 */
export function RootLayout() {
  useSession()

  return <Outlet />
}
