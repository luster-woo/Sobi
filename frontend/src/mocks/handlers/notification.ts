import { http, HttpResponse } from 'msw'

// 빨간 점 없는 상태: sessionStorage.setItem('msw:unread', '0')
const UNREAD_KEY = 'msw:unread'
const DEFAULT_UNREAD = 3

/** 알림 (notification) 목 핸들러 */
export const notificationHandlers = [
  // GET /api/v1/notifications/unread-count
  http.get('/api/v1/notifications/unread-count', () => {
    const override = sessionStorage.getItem(UNREAD_KEY)
    const count = override === null ? DEFAULT_UNREAD : Number(override)

    return HttpResponse.json({ count: Number.isNaN(count) ? 0 : count })
  }),
]
