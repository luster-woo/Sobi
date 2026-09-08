import { useUnreadNotificationCount } from '@/features/notification/hooks/useUnreadNotificationCount'
import { BellIcon } from '@/shared/ui/icons'

interface NotificationBellProps {
  /** 드롭다운을 여는 쪽. 132 에서 넘긴다 */
  onToggle?: () => void
  open?: boolean
}

/** 알림 벨. 미확인이 있을 때만 빨간 점을 그린다. 드롭다운은 132 몫 */
export function NotificationBell({ onToggle, open }: NotificationBellProps) {
  const unreadCount = useUnreadNotificationCount()
  const hasUnread = unreadCount > 0

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!onToggle}
      // 점은 낭독기에 읽히지 않으므로 개수를 여기 넣는다
      aria-label={hasUnread ? `알림 ${unreadCount}건` : '알림'}
      aria-haspopup="menu"
      aria-expanded={onToggle ? Boolean(open) : undefined}
      className="text-text-secondary hover:bg-surface-muted hover:text-text disabled:hover:text-text-secondary relative flex size-9 items-center justify-center rounded-md transition-colors disabled:cursor-default disabled:hover:bg-transparent"
    >
      <BellIcon className="size-5" />

      {hasUnread && (
        // ring 이 없으면 점이 벨 획에 붙어 모양이 안 보인다
        <span
          aria-hidden="true"
          className="bg-danger ring-surface absolute top-1.5 right-1.5 size-2 rounded-full ring-2"
        />
      )}
    </button>
  )
}
