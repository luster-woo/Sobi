import { cn } from '@/utils/format'

import { IconChevronRight } from './Icon'

interface PaginationProps {
  page: number
  total: number
  onChange: (p: number) => void
}

export default function Pagination({ page, total, onChange }: PaginationProps) {
  return (
    <nav className="flex items-center justify-center gap-1 py-4" aria-label="페이지">
      {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={cn(
            'typo-body2 size-8 rounded-md transition-colors',
            p === page ? 'text-text font-semibold' : 'text-text-muted hover:bg-surface-muted',
          )}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        aria-label="다음 페이지"
        disabled={page >= total}
        onClick={() => onChange(page + 1)}
        className="text-text-muted hover:bg-surface-muted size-8 rounded-md disabled:opacity-40"
      >
        <IconChevronRight size={14} className="mx-auto" />
      </button>
    </nav>
  )
}
