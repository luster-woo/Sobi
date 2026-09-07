import { cn } from '@/utils/format'

export interface Step {
  label: string
  sub?: string
  done: boolean
}

/** 승인 → 약정 체결 → 계좌 입금 같은 가로 진행 단계 */
export default function Stepper({ steps, className = '' }: { steps: Step[]; className?: string }) {
  return (
    <ol className={cn('flex items-start', className)}>
      {steps.map((s, i) => (
        <li key={s.label} className="relative flex flex-1 flex-col items-center">
          {i > 0 && (
            <span
              className={cn(
                'absolute top-[7px] right-1/2 h-px w-full',
                steps[i - 1].done && s.done ? 'bg-primary' : 'bg-border',
              )}
            />
          )}
          <span
            className={cn(
              'relative z-10 size-[15px] rounded-full border-2',
              s.done ? 'border-primary bg-primary' : 'border-primary bg-surface',
            )}
          />
          <span className="typo-body2 text-text mt-2">{s.label}</span>
          {s.sub && <span className="typo-caption text-text-muted mt-0.5">{s.sub}</span>}
        </li>
      ))}
    </ol>
  )
}
