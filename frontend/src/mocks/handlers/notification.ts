import { http } from 'msw'

import type { NotificationItem } from '@/features/notification/model/types'
import { ok } from '@/mocks/lib/envelope'
import { NOTIFICATION_TYPE } from '@/shared/types'

const SCHEDULE_HOUR = 4

/** n 일 전 04:00 */
function batchAt(daysAgo: number): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(SCHEDULE_HOUR, 0, 0, 0)

  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(SCHEDULE_HOUR)}:00:00`
}

let notifications: NotificationItem[] = [
  // 오늘 배치
  {
    id: 6,
    userId: 1,
    type: NOTIFICATION_TYPE.NEW_SUPPORT_PROGRAM,
    targetId: 214,
    targetName: '고용촉진장려금',
    isChecked: false,
    createdAt: batchAt(0),
    deletedAt: null,
  },
  {
    id: 5,
    userId: 1,
    type: NOTIFICATION_TYPE.NEW_SUPPORT_PROGRAM,
    targetId: 187,
    targetName: '대구 소상공인 이자 지원',
    isChecked: false,
    createdAt: batchAt(0),
    deletedAt: null,
  },
  {
    id: 4,
    userId: 1,
    type: NOTIFICATION_TYPE.NEW_SUPPORT_PROGRAM,
    targetId: 173,
    targetName: '소상공인 경영개선 컨설팅',
    isChecked: false,
    createdAt: batchAt(0),
    deletedAt: null,
  },
  // 어제 배치
  {
    id: 3,
    userId: 1,
    type: NOTIFICATION_TYPE.NEW_SUPPORT_PROGRAM,
    targetId: 158,
    targetName: '스마트상점 기술보급 사업',
    isChecked: false,
    createdAt: batchAt(1),
    deletedAt: null,
  },
  {
    id: 2,
    userId: 1,
    type: NOTIFICATION_TYPE.NEW_SUPPORT_PROGRAM,
    targetId: 142,
    targetName: '소상공인 디지털 전환 지원',
    isChecked: true,
    createdAt: batchAt(1),
    deletedAt: null,
  },
  // 사흘 전 배치
  {
    id: 1,
    userId: 1,
    type: NOTIFICATION_TYPE.NEW_SUPPORT_PROGRAM,
    targetId: 119,
    targetName: '음식점 위생등급 지정 지원',
    isChecked: true,
    createdAt: batchAt(3),
    deletedAt: null,
  },
]

/**
 * 알림 (notification) 목 핸들러.
 *
 * ⚠️ 백엔드 **전체 보류**. 필드 모양은 추정이고 이 목이 유일한 구현이다.
 */
export const notificationHandlers = [
  // GET /api/v1/notifications/unread-count
  http.get('/api/v1/notifications/unread-count', () => {
    const count = notifications.filter((n) => !n.isChecked).length

    return ok({ count }, '미확인 알림 개수 조회 성공', {
      path: '/api/v1/notifications/unread-count',
    })
  }),

  // GET /api/v1/notifications
  http.get('/api/v1/notifications', () =>
    ok(notifications, '알림 목록 조회 성공', { path: '/api/v1/notifications' }),
  ),

  // PATCH /api/v1/notifications/:notificationId/read
  http.patch('/api/v1/notifications/:notificationId/read', ({ params }) => {
    const id = Number(params.notificationId)
    notifications = notifications.map((n) => (n.id === id ? { ...n, isChecked: true } : n))

    return ok(null, '알림 읽음 처리 성공', {
      path: `/api/v1/notifications/${String(id)}/read`,
    })
  }),

  // PATCH /api/v1/notifications/read-all
  http.patch('/api/v1/notifications/read-all', () => {
    notifications = notifications.map((n) => ({ ...n, isChecked: true }))

    return ok(null, '알림 전체 읽음 처리 성공', { path: '/api/v1/notifications/read-all' })
  }),
]
