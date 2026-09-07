import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  /** 제목 바로 아래 한 줄 설명 */
  description?: ReactNode
  children?: ReactNode
  /** 하단 버튼 영역. 보통 <Button> 두 개 */
  footer?: ReactNode
  className?: string
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className = '',
}: ModalProps) {
  /* ESC 로 닫기 + 열려 있는 동안 배경 스크롤 잠금 */
  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-text/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full max-w-[440px] rounded-xl bg-surface ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-4 p-7 pb-0">
          <div className="space-y-1">
            <h2 className="typo-h3">{title}</h2>
            {description && (
              <p className="typo-body2 text-text-secondary">{description}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="-mr-1 -mt-1 rounded-sm p-1 text-text-muted hover:text-text"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        {children && <div className="px-7 py-6">{children}</div>}

        {/* 하단 버튼 */}
        {footer && (
          <>
            <hr className="border-0 h-px bg-border-subtle" />
            <div className="flex justify-end gap-3 p-5">{footer}</div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
