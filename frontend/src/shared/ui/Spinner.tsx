import { cn } from '@/shared/lib/format'

export default function Spinner({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      role="status"
      aria-label="로딩 중"
      className={cn('inline-block animate-spin rounded-full border-[3px] border-border border-t-primary', className)}
      style={{ width: size, height: size }}
    />
  )
}
