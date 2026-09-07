import { IconBookmark } from './Icon'
import { cn } from '@/shared/lib/format'

interface BookmarkButtonProps {
  active: boolean
  onToggle?: () => void
  size?: number
  className?: string
}

export default function BookmarkButton({ active, onToggle, size = 20, className = '' }: BookmarkButtonProps) {
  return (
    <button
      type="button"
      aria-label={active ? '관심 목록에서 제거' : '관심 목록에 추가'}
      aria-pressed={active}
      onClick={(e) => {
        e.stopPropagation()
        onToggle?.()
      }}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-md transition-colors hover:bg-surface-muted',
        active ? 'text-primary' : 'text-text-muted',
        className,
      )}
    >
      <IconBookmark size={size} filled={active} />
    </button>
  )
}
