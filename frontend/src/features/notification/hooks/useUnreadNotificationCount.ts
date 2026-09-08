import { useQuery } from '@tanstack/react-query'

import { getUnreadNotificationCount } from '@/features/notification/api/unreadCount'
import { queryKeys } from '@/shared/api/queryKeys'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'

const REFETCH_INTERVAL_MS = 60 * 1000

/** 상단바 벨의 미확인 개수. 실패하면 0 으로 본다 */
export function useUnreadNotificationCount() {
  const status = useAuthStore((s) => s.status)

  const { data } = useQuery({
    queryKey: queryKeys.notification.unreadCount,
    queryFn: getUnreadNotificationCount,
    enabled: status === 'authenticated',
    refetchInterval: REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
    retry: 1,
  })

  return data ?? 0
}
