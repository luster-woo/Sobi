import { useAuthStore } from '@/shared/lib/store/useAuthStore'

/** 화면은 176(대시보드)에서 만든다. 세션 복구가 됐는지 확인하는 자리다. */
export function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  return <div>dashboard ({user?.name ?? 'no user'})</div>
}
