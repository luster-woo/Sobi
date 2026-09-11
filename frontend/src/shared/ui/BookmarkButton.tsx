import { cn } from '@/shared/utils/cn'

interface BookmarkButtonProps {
  bookmarked: boolean
  onToggle: () => void
  /** 낭독기가 무엇을 담는지 알아야 한다. 상품명을 넘긴다 */
  label: string
  className?: string
}

/**
 * 관심 목록 담기·빼기.
 *
 * 카드(ProductCard)와 상세 모달이 같은 동작을 하므로 한 컴포넌트로 둔다. 모양이
 * 갈리면 같은 기능인지 알아보기 어렵다.
 *
 * 담긴 상태를 색이 아니라 **채움**으로 알린다. 리본이 비었는지 찼는지는 색맹 여부와
 * 무관하게 보인다.
 */
export default function BookmarkButton({
  bookmarked,
  onToggle,
  label,
  className,
}: BookmarkButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={bookmarked}
      aria-label={`${label} ${bookmarked ? '관심 목록에서 빼기' : '관심 목록에 담기'}`}
      onClick={(event) => {
        // 카드 안에 있을 때 카드 클릭(상세 열기)까지 번지지 않게 막는다
        event.stopPropagation()
        onToggle()
      }}
      className={cn(
        'focus-visible:outline-primary hover:bg-surface-muted flex shrink-0 rounded-sm p-1 transition-colors focus-visible:outline focus-visible:outline-offset-1',
        bookmarked ? 'text-primary' : 'text-text-disabled hover:text-text-secondary',
        className,
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-[17px]"
        fill={bookmarked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      >
        <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" />
      </svg>
    </button>
  )
}
