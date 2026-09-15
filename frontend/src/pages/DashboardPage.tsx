import OwnerDashboard from '@/features/dashboard/components/OwnerDashboard'
import PreOwnerDashboard from '@/features/dashboard/components/PreOwnerDashboard'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import { isPreOwner } from '@/shared/types'

/**
 * 대시보드는 role 에 따라 화면이 완전히 갈린다. 이 파일은 갈림길만 담당하고
 * 내용은 features/dashboard/components/ 의 두 컴포넌트가 만든다.
 *
 * 라우트를 /dashboard 하나로 둔 이유: 예비창업자가 사업자 인증을 마쳐 role 이
 * 바뀌면 같은 주소가 알아서 사업자 대시보드로 바뀐다. 주소를 둘로 나누면
 * 사이드바 링크와 리다이렉트 가드를 role 마다 따로 만들어야 한다.
 *
 * role 이 null 이어도 예비 창업자로 본다 — `isPreOwner` 주석 참고. 예전에는 여기서
 * 온보딩(`/verify`)으로 되돌려보냈는데, 정작 '예비 창업자로 시작하기' 가 role 을
 * 남기지 않고 대시보드로 보내는 터라 둘이 무한히 왕복했다.
 */
export function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  // 세션 복구 중에는 user 가 아직 null
  if (!user) return null

  return isPreOwner(user.role) ? <PreOwnerDashboard /> : <OwnerDashboard />
}
