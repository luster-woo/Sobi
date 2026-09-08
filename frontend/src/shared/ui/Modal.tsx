import { type ReactNode, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/shared/utils/cn'

/** 포커스 트랩이 순회할 대상. disabled 요소와 tabindex="-1" 은 제외합니다 */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  /** 제목 바로 아래 한 줄 설명 */
  description?: string
  children?: ReactNode
  /** 하단 버튼 영역. 넘기면 위에 구분선이 생깁니다. 보통 <Button> 두 개 */
  footer?: ReactNode
  /** md 440 · lg 720 (px). 상권 분석 조건 입력처럼 넓은 폼은 lg */
  size?: 'md' | 'lg'
  /**
   * 오버레이를 눌러 닫을 수 있게 할지. 기본 true.
   * 탈퇴·삭제 확인처럼 실수로 닫히면 안 되는 경우 false 로 끕니다.
   */
  closeOnOverlayClick?: boolean
  className?: string
}

const sizeClass = {
  md: 'max-w-[440px]',
  lg: 'max-w-[720px]',
} as const

/**
 * 화면 위에 뜨는 창.
 *
 * 사용자에게 확인을 요구하거나 흐름을 잠시 멈춰야 할 때 씁니다.
 * 결과만 알리면 되는 경우에는 Toast 를 쓰세요 — 모달은 화면을 막습니다.
 *
 * 챙기고 있는 것: ESC 닫기 · 오버레이 클릭 닫기 · 배경 스크롤 잠금 ·
 * 포커스 트랩(Tab 이 모달 밖으로 안 나감) · 닫을 때 원래 요소로 포커스 복귀
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
  className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const baseId = useId()
  const titleId = `${baseId}-title`
  const descriptionId = `${baseId}-description`

  /* 열릴 때 모달로 포커스를 옮기고, 닫힐 때 원래 요소로 되돌립니다 */
  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    panelRef.current?.focus()

    return () => previouslyFocused?.focus()
  }, [open])

  /* 배경 스크롤 잠금 */
  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  /* ESC 닫기 + 포커스 트랩 */
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return

      const focusables = panel.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (focusables.length === 0) {
        // 누를 게 없으면 Tab 으로 모달 밖으로 나가는 것만 막습니다
        event.preventDefault()
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="bg-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        // 오버레이의 onClick 이 패널 클릭에도 걸리지 않게 전파를 끊습니다
        onClick={(event) => event.stopPropagation()}
        className={cn(
          'bg-surface shadow-modal flex max-h-[calc(100vh-4rem)] w-full flex-col rounded-xl',
          sizeClass[size],
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 px-7 pt-7">
          <div className="space-y-1">
            <h2 id={titleId} className="text-h3">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="text-body2 text-text-secondary">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="text-text-muted hover:text-text -mt-1 -mr-1 shrink-0 rounded-sm p-1 transition-colors"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* 본문이 길면 여기만 스크롤됩니다. 제목·버튼은 자리에 남습니다 */}
        {children && <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">{children}</div>}

        {footer && (
          <div className="border-border-subtle flex justify-end gap-3 border-t p-5">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  )
}
