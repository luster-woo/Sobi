import { useEffect, useRef, useState } from 'react'

import { NotificationDropdown } from '@/app/layouts/Topbar/NotificationDropdown'
import { useUnreadNotificationCount } from '@/features/notification/hooks/useUnreadNotificationCount'
import { BellIcon } from '@/shared/ui/icons'

/** 알림 벨과 드롭다운. 미확인이 있을 때만 빨간 점을 그린다 */
export function NotificationBell() {
  const unreadCount = useUnreadNotificationCount()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const hasUnread = unreadCount > 0

  /* 바깥 클릭 · ESC 로 닫기 */
  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    // click 이 아니라 mousedown 이다. click 은 드롭다운 항목이 이동시킨 뒤에 올라와
    // 이미 사라진 요소를 검사하게 된다
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        // 점은 낭독기에 읽히지 않으므로 개수를 여기 넣는다
        aria-label={hasUnread ? `알림 ${unreadCount}건` : '알림'}
        aria-haspopup="menu"
        aria-expanded={open}
        className="text-text-secondary hover:bg-surface-muted hover:text-text aria-expanded:bg-surface-muted relative flex size-9 items-center justify-center rounded-md transition-colors"
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

      {open && <NotificationDropdown onClose={() => setOpen(false)} />}
    </div>
  )
}
