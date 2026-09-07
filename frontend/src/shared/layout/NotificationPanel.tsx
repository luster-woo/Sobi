import { useState } from 'react'
import type { Notification } from '@/shared/types'
import { IconClose } from '@/shared/ui/Icon'
import { cn } from '@/shared/lib/format'

interface NotificationPanelProps {
  items: Notification[]
  onClose: () => void
}

/** 접힘 상태에서 보여줄 알림 수 */
const COLLAPSED_COUNT = 4

/** 19. 헤더 알림 패널 — "알림 전체 보기"로 펼치면 전체 목록을 스크롤로 확인 */
export default function NotificationPanel({ items: initial, onClose }: NotificationPanelProps) {
  const [items, setItems] = useState(initial)
  const [expanded, setExpanded] = useState(false)

  const unread = items.filter((n) => !n.read).length
  const visible = expanded ? items : items.slice(0, COLLAPSED_COUNT)
  const hiddenCount = items.length - visible.length

  const readAll = () => setItems((xs) => xs.map((n) => ({ ...n, read: true })))
  const removeRead = () => setItems((xs) => xs.filter((n) => !n.read))
  const remove = (id: string) => setItems((xs) => xs.filter((n) => n.id !== id))

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label="알림"
        className="absolute right-0 top-[calc(100%+10px)] z-50 flex w-[380px] flex-col rounded-lg border border-border bg-surface shadow-[0_12px_32px_rgb(25_27_26/0.12)]"
      >
        <span className="absolute -top-[7px] right-[86px] size-3 rotate-45 border-l border-t border-border bg-surface" />

        <div className="flex shrink-0 items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="typo-h4">알림</span>
            {unread > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 typo-badge text-white">
                {unread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={readAll} className="typo-caption text-text-muted hover:text-text">
              모두 읽음 처리
            </button>
            <button type="button" onClick={removeRead} className="typo-caption text-text hover:text-text-secondary">
              읽음 삭제
            </button>
          </div>
        </div>

        <ul
          className={cn(
            'overflow-y-auto border-t border-border-subtle overscroll-contain',
            expanded ? 'max-h-[min(560px,70vh)]' : 'max-h-[320px]',
          )}
        >
          {visible.length === 0 && <li className="px-5 py-10 text-center typo-body2 text-text-muted">새 알림이 없어요</li>}
          {visible.map((n) => (
            <li key={n.id} className="flex gap-3 border-b border-border-subtle px-5 py-4 last:border-b-0">
              <span
                className={cn('mt-[7px] size-1.5 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-danger')}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className={cn('typo-body2', n.read ? 'text-text-secondary' : 'text-text')}>{n.title}</p>
                <p className="mt-1 typo-caption text-text-muted">{n.body}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="typo-caption text-text-muted">{n.time}</span>
                <button
                  type="button"
                  aria-label="알림 삭제"
                  onClick={() => remove(n.id)}
                  className="text-text-muted hover:text-text"
                >
                  <IconClose size={12} />
                </button>
              </div>
            </li>
          ))}
        </ul>

        {items.length > COLLAPSED_COUNT && (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 border-t border-border-subtle py-4 typo-label-sm text-text hover:bg-surface-muted"
          >
            {expanded ? '접기' : `알림 전체 보기 (${hiddenCount}건 더)`}
          </button>
        )}
      </div>
    </>
  )
}
