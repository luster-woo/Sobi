import type { NotificationItem } from '@/features/notification/model/types'
import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'
import type { ID } from '@/shared/types'

/** 최신순 알림 목록. 드롭다운을 열 때만 부른다 */
export async function getNotifications() {
  const { data } = await api.get<NotificationItem[]>(endpoints.notification.list)
  return data
}

export async function markNotificationRead(notificationId: ID) {
  await api.patch(endpoints.notification.read(notificationId))
}

export async function markAllNotificationsRead() {
  await api.patch(endpoints.notification.readAll)
}
