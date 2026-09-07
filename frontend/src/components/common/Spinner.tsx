import { cn } from '@/utils/format'

export default function Spinner({
  size = 48,
  className = '',
}: {
  size?: number
  className?: string
}) {
  return (
    <span
      role="status"
      aria-label="로딩 중"
      className={cn(
        'border-border border-t-primary inline-block animate-spin rounded-full border-[3px]',
        className,
      )}
      style={{ width: size, height: size }}
    />
  )
}
