import { api } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'

interface UnreadCountResponse {
  count: number
}

/** 미확인 알림 개수. 목록은 132(드롭다운)에서 따로 받는다 */
export async function getUnreadNotificationCount() {
  const { data } = await api.get<UnreadCountResponse>(endpoints.notification.unreadCount)
  return data.count
}
