import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

import { getDashboard } from '@/features/dashboard/api/dashboard'
import { queryKeys } from '@/shared/api/queryKeys'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'

const STALE_TIME_MS = 60 * 1000

/** 서버가 DB 의 role 로 응답 모양을 가르므로 한 번만 부르고 모양으로 구분한다 */
export function useDashboard() {
  const status = useAuthStore((s) => s.status)

  return useQuery({
    queryKey: queryKeys.dashboard.me,
    queryFn: getDashboard,
    enabled: status === 'authenticated',
    staleTime: STALE_TIME_MS,
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 404) return false
      return failureCount < 2
    },
  })
}
