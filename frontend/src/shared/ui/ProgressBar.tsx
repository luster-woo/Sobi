import { cn } from '@/shared/utils/cn'

interface ProgressBarProps {
  /** 0~100. 범위를 벗어나면 잘라낸다 */
  value: number
  /** 오른쪽에 퍼센트 숫자를 붙일지 */
  showValue?: boolean
  /** 낭독기가 읽을 문구. '무엇의' 진행률인지 밝힌다 */
  label: string
  className?: string
}

/**
 * 진행률 막대.
 *
 * 끝나는 시점을 알 때만 쓴다. 언제 끝날지 모르는 대기에는 Spinner 를 쓴다 —
 * 60%에서 멈춘 막대는 사용자에게 고장으로 읽힌다.
 *
 * 숫자를 화면에 보여줄 때도 aria-valuenow 를 함께 둔다. 낭독기는 옆의 텍스트가
 * 이 막대의 값이라는 걸 모른다.
 */
export default function ProgressBar({
  value,
  showValue = false,
  label,
  className,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)))

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className="bg-border h-1.5 min-w-0 flex-1 overflow-hidden rounded-full"
      >
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${clamped}%` }}
        />
      </div>

      {showValue && (
        <span className="text-caption text-text shrink-0 font-medium tabular-nums">{clamped}%</span>
      )}
    </div>
  )
}
