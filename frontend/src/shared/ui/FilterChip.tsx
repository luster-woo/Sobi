import type { ReactNode } from 'react'
import { IconChevronDown } from './Icon'
import { cn } from '@/shared/lib/format'

interface FilterChipProps {
  children: ReactNode
  active?: boolean
  dropdown?: boolean
  onClick?: () => void
}

/** 목록 상단 필터 칩 — "판정 결과 ⌄" / "전체 4" */
export default function FilterChip({ children, active = false, dropdown = false, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center gap-1 rounded-full border px-4 typo-label-sm transition-colors',
        active
          ? 'border-text bg-surface text-text'
          : 'border-border-strong bg-surface text-text-secondary hover:bg-surface-muted',
      )}
    >
      {children}
      {dropdown && <IconChevronDown size={14} className="text-text-muted" />}
    </button>
  )
}
