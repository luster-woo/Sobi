import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/notification/api/notifications'
import { queryKeys } from '@/shared/api/queryKeys'
import type { ID } from '@/shared/types'

/** 드롭다운이 열려 있을 때만 렌더되는 곳에서 호출한다 */
export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notification.list,
    queryFn: getNotifications,
    // 열 때마다 최신을 본다. 스케줄러가 하루 한 번 넣으므로 캐시를 오래 둘 이유가 없다
    staleTime: 0,
  })
}

/** 읽음 처리. 목록과 미확인 개수를 함께 무효화해 빨간 점까지 갱신된다 */
export function useReadNotification() {
  const queryClient = useQueryClient()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notification.all })
  }

  const readOne = useMutation({
    mutationFn: (notificationId: ID) => markNotificationRead(notificationId),
    onSuccess: invalidate,
  })

  const readAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: invalidate,
  })

  return { readOne, readAll }
}
