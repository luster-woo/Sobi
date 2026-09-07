import { IconChevronRight } from './Icon'
import { cn } from '@/shared/lib/format'

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
            'size-8 rounded-md typo-body2 transition-colors',
            p === page ? 'font-semibold text-text' : 'text-text-muted hover:bg-surface-muted',
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
        className="size-8 rounded-md text-text-muted hover:bg-surface-muted disabled:opacity-40"
      >
        <IconChevronRight size={14} className="mx-auto" />
      </button>
    </nav>
  )
}
