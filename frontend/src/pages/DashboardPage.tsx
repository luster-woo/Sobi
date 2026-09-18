import DashboardFallback from '@/features/dashboard/components/DashboardFallback'
import OwnerDashboard from '@/features/dashboard/components/OwnerDashboard'
import PreOwnerDashboard from '@/features/dashboard/components/PreOwnerDashboard'
import { useDashboard } from '@/features/dashboard/hooks/useDashboard'

/**
 * 대시보드는 role 에 따라 화면이 완전히 갈린다. 이 파일은 갈림길만 담당하고
 * 내용은 features/dashboard/components/ 의 두 컴포넌트가 만든다.
 *
 * 라우트를 /dashboard 하나로 둔 이유: 예비창업자가 사업자 인증을 마쳐 role 이
 * 바뀌면 같은 주소가 알아서 사업자 대시보드로 바뀐다. 주소를 둘로 나누면
 * 사이드바 링크와 리다이렉트 가드를 role 마다 따로 만들어야 한다.
 *
 * 어느 쪽을 그릴지는 store 의 role 이 아니라 응답 모양으로 정한다. 서버는 DB 의 role 로
 * 응답을 가르는데, 인증 직후처럼 토큰의 role 이 아직 낡아 있을 수 있다.
 */
export function DashboardPage() {
  const { data, isError, refetch } = useDashboard()

  if (!data) return <DashboardFallback isError={isError} onRetry={() => void refetch()} />

  return data.kind === 'owner' ? (
    <OwnerDashboard dashboard={data.data} />
  ) : (
    <PreOwnerDashboard dashboard={data.data} />
  )
}
