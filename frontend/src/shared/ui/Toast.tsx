import { useEffect, useState } from 'react'

import type { ToastVariant } from '@/shared/lib/store/useUiStore'
import { cn } from '@/shared/utils/cn'

interface ToastProps {
  id: string
  message: string
  variant?: ToastVariant
  /** 자동으로 닫히기까지 ms. 넘기지 않으면 variant 기본값을 씁니다 */
  duration?: number
  /**
   * 스토어의 dismissToast 를 그대로 넘깁니다.
   * 인라인 화살표를 넘기면 렌더마다 함수가 새로 생겨 자동 닫힘 타이머가 처음부터 다시 갑니다.
   */
  onDismiss: (id: string) => void
}

const variantClass: Record<ToastVariant, string> = {
  success: 'border-success/25 bg-success-soft text-primary-active',
  warning: 'border-warning/25 bg-warning-soft text-warning',
  danger: 'border-danger/25 bg-danger-soft text-danger',
}

/** 에러는 읽는 데 시간이 더 걸리므로 오래 띄웁니다 */
const defaultDuration: Record<ToastVariant, number> = {
  success: 3000,
  warning: 4000,
  danger: 5000,
}

function VariantIcon({ variant }: { variant: ToastVariant }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="mt-0.5 size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {variant === 'success' ? (
        <path d="m5 12 4.5 4.5L19 7" />
      ) : (
        <>
          <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
          <path d="M12 7.5v5M12 16.5h.01" />
        </>
      )}
    </svg>
  )
}

/**
 * 토스트 하나.
 *
 * 자동 닫힘 타이머를 이 컴포넌트가 직접 들고 있습니다. useUiStore 주석에 적힌 계약이고,
 * 이렇게 하면 사용자가 X 를 눌러 먼저 닫아도 언마운트와 함께 타이머가 정리됩니다.
 *
 * 큐 구독·화면 배치는 ToastViewport 의 몫입니다. 이 컴포넌트는 스토어를 모릅니다.
 */
export default function Toast({
  id,
  message,
  variant = 'success',
  duration,
  onDismiss,
}: ToastProps) {
  // 마운트 직후 한 프레임 뒤에 보이게 만들어 나타나는 전환을 줍니다.
  // index.css 에 keyframes 를 추가하지 않으려고 transition 유틸리티만 씁니다.
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), duration ?? defaultDuration[variant])
    return () => clearTimeout(timer)
  }, [id, duration, variant, onDismiss])

  return (
    <div
      // 에러만 즉시 끼어들게 alert. 나머지는 ToastViewport 의 상시 live region 이 읽는다
      role={variant === 'danger' ? 'alert' : undefined}
      className={cn(
        'shadow-dropdown pointer-events-auto flex w-[320px] items-start gap-3 rounded-md border px-4 py-3',
        'transition-all duration-200 motion-reduce:transition-none',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0',
        variantClass[variant],
      )}
    >
      <VariantIcon variant={variant} />
      <p className="text-body2 min-w-0 flex-1 break-words">{message}</p>

      <button
        type="button"
        aria-label="알림 닫기"
        onClick={() => onDismiss(id)}
        className="-mr-1 shrink-0 rounded-sm p-1 opacity-60 transition-opacity hover:opacity-100"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  )
}
