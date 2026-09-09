import type { ReactNode } from 'react'

import { cn } from '@/shared/utils/cn'

interface FilterChipProps {
  label: ReactNode
  selected: boolean
  onToggle: () => void
  className?: string
}

/**
 * 시안의 .chip / .chip.sel — 켜고 끄는 필터 칩.
 *
 * 선택되면 X 아이콘이 붙습니다. 색만 바뀌면 "선택됨" 인지 "누를 수 있음" 인지
 * 필터에 X 가 있을때 다시 누르면 해제됨
 */
export default function FilterChip({ label, selected, onToggle, className }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        'text-body2 inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-sm border px-3 transition-colors',
        selected
          ? 'border-primary bg-primary-soft text-primary font-medium'
          : 'border-border bg-surface text-text-secondary hover:border-border-strong',
        className,
      )}
    >
      {label}
      {selected && (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      )}
    </button>
  )
}