import { cn } from '@/shared/utils/cn'
import { getPageItems, PAGE_ELLIPSIS } from '@/shared/utils/pagination'

interface PaginationProps {
  /** 현재 페이지 (1-base) */
  page: number
  totalPages: number
  onChange: (page: number) => void
  /** 현재 페이지 좌우로 보여줄 페이지 수. 좁은 영역이면 0 */
  siblingCount?: number
  className?: string
}

const itemBase =
  'inline-flex h-9 min-w-9 items-center justify-center rounded-sm px-2 text-body2 transition-colors'
const itemIdle = 'text-text-secondary hover:bg-surface-muted'
const itemActive = 'bg-primary text-text-inverse font-semibold'

/*
 * disabled 에 pointer-events-none 을 주는 이유: hover 배경이 남는 걸 막는다.
 * Button 은 opacity 로 처리하지만, 아이콘만 있는 화살표는 흐려지면 잘 안 보인다.
 */
const itemDisabled = 'disabled:text-text-disabled disabled:pointer-events-none'

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={direction === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  )
}

/**
 * 서버 페이징(PageResponse) 용 페이지네이션.
 *
 * page 는 1-base 다. 서버 응답의 page.number 는 0 부터라 그대로 넘기면 한 칸씩 어긋난다
 * — toUiPage 로 변환해서 넘기고, 요청할 때 toServerPage 로 되돌린다.
 *
 * totalPages 가 1 이하면 아무것도 그리지 않는다. 목록이 한 페이지뿐인데 '1' 버튼
 * 하나만 떠 있으면 더 있는 것처럼 보인다.
 */
export default function Pagination({
  page,
  totalPages,
  onChange,
  siblingCount = 1,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const items = getPageItems({ page, totalPages, siblingCount })

  return (
    <nav
      aria-label="페이지네이션"
      className={cn('flex items-center justify-center gap-1', className)}
    >
      <button
        type="button"
        aria-label="이전 페이지"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className={cn(itemBase, itemIdle, itemDisabled)}
      >
        <ChevronIcon direction="left" />
      </button>

      {items.map((item, index) =>
        item === PAGE_ELLIPSIS ? (
          <span
            key={`ellipsis-${index}`}
            aria-hidden="true"
            className={cn(itemBase, 'text-text-muted')}
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-label={`${item} 페이지`}
            aria-current={item === page ? 'page' : undefined}
            onClick={() => onChange(item)}
            className={cn(itemBase, item === page ? itemActive : itemIdle)}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        aria-label="다음 페이지"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className={cn(itemBase, itemIdle, itemDisabled)}
      >
        <ChevronIcon direction="right" />
      </button>
    </nav>
  )
}
