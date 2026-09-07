import { useState } from 'react'

import { IconClose } from '@/components/common/Icon'
import type { Notification } from '@/types'
import { cn } from '@/utils/format'

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
        className="border-border bg-surface absolute top-[calc(100%+10px)] right-0 z-50 flex w-[380px] flex-col rounded-lg border shadow-[0_12px_32px_rgb(25_27_26/0.12)]"
      >
        <span className="border-border bg-surface absolute -top-[7px] right-[86px] size-3 rotate-45 border-t border-l" />

        <div className="flex shrink-0 items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="typo-h4">알림</span>
            {unread > 0 && (
              <span className="bg-secondary typo-badge inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-white">
                {unread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={readAll}
              className="typo-caption text-text-muted hover:text-text"
            >
              모두 읽음 처리
            </button>
            <button
              type="button"
              onClick={removeRead}
              className="typo-caption text-text hover:text-text-secondary"
            >
              읽음 삭제
            </button>
          </div>
        </div>

        <ul
          className={cn(
            'border-border-subtle overflow-y-auto overscroll-contain border-t',
            expanded ? 'max-h-[min(560px,70vh)]' : 'max-h-[320px]',
          )}
        >
          {visible.length === 0 && (
            <li className="typo-body2 text-text-muted px-5 py-10 text-center">새 알림이 없어요</li>
          )}
          {visible.map((n) => (
            <li
              key={n.id}
              className="border-border-subtle flex gap-3 border-b px-5 py-4 last:border-b-0"
            >
              <span
                className={cn(
                  'mt-[7px] size-1.5 shrink-0 rounded-full',
                  n.read ? 'bg-transparent' : 'bg-danger',
                )}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className={cn('typo-body2', n.read ? 'text-text-secondary' : 'text-text')}>
                  {n.title}
                </p>
                <p className="typo-caption text-text-muted mt-1">{n.body}</p>
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
            className="border-border-subtle typo-label-sm text-text hover:bg-surface-muted shrink-0 border-t py-4"
          >
            {expanded ? '접기' : `알림 전체 보기 (${hiddenCount}건 더)`}
          </button>
        )}
      </div>
    </>
  )
}
