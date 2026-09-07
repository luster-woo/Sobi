import type { ReactNode } from 'react'

import { cn } from '@/utils/format'

/** 상품 카드·목록의 연한 회색 속성 칩 (운전자금 · 보증서 필요 · ~ 9.30) */
export default function Tag({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'bg-bg typo-caption text-text-secondary inline-flex h-[22px] items-center rounded-full px-2.5',
        className,
      )}
    >
      {children}
    </span>
  )
}
