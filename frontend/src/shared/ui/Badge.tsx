import type { ReactNode } from 'react'

import { cn } from '@/shared/utils/cn'

type Variant = 'success' | 'neutral' | 'outline' | 'danger'

interface BadgeProps {
  /** success 통과·가능 · neutral 진행 중 · outline 대기·미제출 · danger 실패 */
  variant?: Variant
  children: ReactNode
  className?: string
}

const variantClass: Record<Variant, string> = {
  success: 'bg-primary text-text-inverse',
  neutral: 'bg-bg-canvas text-text-secondary',
  outline: 'bg-surface text-text-muted border-border-strong border',
  danger: 'bg-danger-soft text-danger',
}

/** 상태를 한 단어로 알리는 알약. 색만으로 구분하지 않게 문구가 항상 함께 들어간다 */
export default function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'text-caption inline-flex h-[21px] shrink-0 items-center rounded-full px-2 font-medium whitespace-nowrap',
        variantClass[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
