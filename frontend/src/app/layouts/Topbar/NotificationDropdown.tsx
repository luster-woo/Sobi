import { useNavigate } from 'react-router'

import {
  useNotifications,
  useReadNotification,
} from '@/features/notification/hooks/useNotifications'
import { notificationLink, notificationMessage } from '@/features/notification/model/message'
import { formatRelativeTime } from '@/features/notification/model/relativeTime'
import type { NotificationItem } from '@/features/notification/model/types'
import { NOTIFICATION_TYPE } from '@/shared/types'
import EmptyState from '@/shared/ui/EmptyState'
import { BellIcon, LoanIcon, SupportProgramIcon } from '@/shared/ui/icons'
import Skeleton from '@/shared/ui/Skeleton'
import { cn } from '@/shared/utils/cn'

function TypeIcon({ type }: Pick<NotificationItem, 'type'>) {
  const isLoan = type === NOTIFICATION_TYPE.NEW_LOAN || type === NOTIFICATION_TYPE.LOAN_REVIEWED

  return isLoan ? (
    <LoanIcon className="size-[17px]" />
  ) : (
    <SupportProgramIcon className="size-[17px]" />
  )
}

interface NotificationDropdownProps {
  onClose: () => void
}

/** 벨 아래 패널. 열려 있을 때만 렌더되므로 여기서 목록을 조회한다 */
export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const navigate = useNavigate()
  const { data: notifications, isPending } = useNotifications()
  const { readOne, readAll } = useReadNotification()

  const hasUnread = notifications?.some((n) => !n.isChecked) ?? false

  const handleSelect = (notification: NotificationItem) => {
    if (!notification.isChecked) readOne.mutate(notification.id)
    onClose()
    navigate(notificationLink(notification))
  }

  return (
    <div
      role="menu"
      aria-label="알림"
      className="bg-surface border-border shadow-dropdown absolute top-full right-0 z-40 mt-2 w-[360px] overflow-hidden rounded-lg border"
    >
      <div className="border-border-subtle flex items-center justify-between border-b px-4 py-3.5">
        <p className="text-h4">알림</p>
        {hasUnread && (
          <button
            type="button"
            onClick={() => readAll.mutate()}
            disabled={readAll.isPending}
            className="text-caption text-text-secondary hover:text-text rounded-sm transition-colors disabled:opacity-50"
          >
            모두 읽음
          </button>
        )}
      </div>

      {isPending ? (
        <div className="space-y-3 p-4" role="status" aria-label="알림을 불러오는 중">
          <Skeleton variant="text" height={13} />
          <Skeleton variant="text" width="70%" height={13} />
          <Skeleton variant="text" width="85%" height={13} />
        </div>
      ) : notifications && notifications.length > 0 ? (
        // 목록이 길어지면 여기만 스크롤된다
        <ul className="max-h-[400px] overflow-y-auto">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleSelect(notification)}
                className={cn(
                  'border-border-subtle hover:bg-surface-muted flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0',
                  !notification.isChecked && 'bg-primary-soft/40',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full',
                    notification.isChecked
                      ? 'bg-surface-muted text-text-muted'
                      : 'bg-primary-soft text-primary',
                  )}
                >
                  <TypeIcon type={notification.type} />
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'text-body2 block',
                      notification.isChecked ? 'text-text-secondary' : 'text-text',
                    )}
                  >
                    {notificationMessage(notification)}
                  </span>
                  <span className="text-caption text-text-muted mt-0.5 block">
                    {formatRelativeTime(notification.createdAt)}
                  </span>
                </span>

                {!notification.isChecked && (
                  <span
                    aria-label="읽지 않음"
                    className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full"
                  />
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          size="sm"
          icon={<BellIcon className="size-[18px]" />}
          title="새 알림이 없어요"
          description="신청할 수 있는 지원사업이 생기면 알려드려요"
        />
      )}
    </div>
  )
}
