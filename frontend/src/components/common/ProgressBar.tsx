import { cn } from '@/utils/format'

interface ProgressBarProps {
  /** 0~100 */
  value: number
  className?: string
  tone?: 'primary' | 'danger'
}

export default function ProgressBar({ value, className = '', tone = 'primary' }: ProgressBarProps) {
  return (
    <div className={cn('bg-border h-1.5 w-full overflow-hidden rounded-full', className)}>
      <div
        className={cn(
          'h-full rounded-full transition-all',
          tone === 'danger' ? 'bg-danger' : 'bg-primary',
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}
