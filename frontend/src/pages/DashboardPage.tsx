import { Navigate } from 'react-router'

import OwnerDashboard from '@/features/dashboard/components/OwnerDashboard'
import PreOwnerDashboard from '@/features/dashboard/components/PreOwnerDashboard'
import { ROUTES } from '@/shared/constants/routes'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import { USER_ROLE } from '@/shared/types'

/**
 * 대시보드는 role 에 따라 화면이 완전히 갈린다. 이 파일은 갈림길만 담당하고
 * 내용은 features/dashboard/components/ 의 두 컴포넌트가 만든다.
 *
 * 라우트를 /dashboard 하나로 둔 이유: 예비창업자가 사업자 인증을 마쳐 role 이
 * 바뀌면 같은 주소가 알아서 사업자 대시보드로 바뀐다. 주소를 둘로 나누면
 * 사이드바 링크와 리다이렉트 가드를 role 마다 따로 만들어야 한다.
 */
export function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  // 세션 복구 중에는 user 가 아직 null
  if (!user) return null

  /*
   * role 이 null 이면 아직 정해지지 않은 것이다. 백엔드가 가입 시점에 role 을 넣지
   * 않고 `POST /business` 로 업체를 등록해야 ENTREPRENEUR 가 된다 — 즉 가입 직후
   * 첫 로그인이 여기 해당한다. 사업자 대시보드를 보여주면 빈 화면이 뜨므로
   * 온보딩으로 보낸다.
   */
  if (user.role === null) return <Navigate to={ROUTES.BUSINESS_VERIFY} replace />

  if (user.role === USER_ROLE.PREENTREPRENEUR) return <PreOwnerDashboard />

  return <OwnerDashboard />
}
