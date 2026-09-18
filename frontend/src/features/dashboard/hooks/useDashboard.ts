import { useQuery } from '@tanstack/react-query'

import { MOCK_OWNER_DASHBOARD, MOCK_PRE_OWNER_DASHBOARD } from '@/features/dashboard/model/mock'
import { queryKeys } from '@/shared/api/queryKeys'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import { isPreOwner } from '@/shared/types'

const STALE_TIME_MS = 60 * 1000

export function useOwnerDashboard() {
  const status = useAuthStore((s) => s.status)
  const role = useAuthStore((s) => s.user?.role)

  return useQuery({
    queryKey: queryKeys.dashboard.owner,
    queryFn: () => Promise.resolve(MOCK_OWNER_DASHBOARD),
    enabled: status === 'authenticated' && !isPreOwner(role ?? null),
    staleTime: STALE_TIME_MS,
  })
}

export function usePreOwnerDashboard() {
  const status = useAuthStore((s) => s.status)
  const role = useAuthStore((s) => s.user?.role)

  return useQuery({
    queryKey: queryKeys.dashboard.preOwner,
    queryFn: () => Promise.resolve(MOCK_PRE_OWNER_DASHBOARD),
    enabled: status === 'authenticated' && isPreOwner(role ?? null),
    staleTime: STALE_TIME_MS,
  })
}
