import { Outlet } from 'react-router'

import IdleWarningModal from '@/features/auth/components/IdleWarningModal'
import { useIdleLogout } from '@/features/auth/hooks/useIdleLogout'
import { useSession } from '@/features/auth/hooks/useSession'

/**
 * 모든 라우트의 부모. 여기서 세션 복구를 시작한다.
 * 헤더·푸터 등 골격은 110(공통 레이아웃)에서 채운다.
 *
 * 유휴 감시도 여기 둔다. 화면을 옮겨도 타이머가 끊기지 않아야 하는데, 라우트가 바뀌어도
 * 이 컴포넌트는 마운트된 채 남는 유일한 자리다 (S15P21D101-395).
 */
export function RootLayout() {
  useSession()

  const { remainingMs, extend } = useIdleLogout()

  return (
    <>
      <Outlet />
      <IdleWarningModal remainingMs={remainingMs} onExtend={extend} />
    </>
  )
}
