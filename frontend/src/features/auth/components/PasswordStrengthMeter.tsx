import { cn } from '@/shared/utils/cn'
import { getPasswordStrength } from '@/shared/utils/validators'

const SEGMENTS = 4

/** getPasswordStrength 가 0~4 를 돌려준다. 0 은 표시하지 않으므로 1부터 매긴다 */
const LABEL: Record<number, string> = {
  1: '약함',
  2: '보통',
  3: '안전함',
  4: '매우 안전함',
}

const LABEL_COLOR: Record<number, string> = {
  1: 'text-danger',
  2: 'text-warning',
  3: 'text-primary',
  4: 'text-primary',
}

interface PasswordStrengthMeterProps {
  password: string
  className?: string
}

/**
 * 비밀번호 강도 표시. 검증과는 별개다 — 통과 여부는 `validatePassword` 가 정하고
 * 여기는 얼마나 안전한지만 알린다. 빈 값일 때는 자리를 차지하지 않는다.
 */
export default function PasswordStrengthMeter({ password, className }: PasswordStrengthMeterProps) {
  if (!password) return null

  const score = getPasswordStrength(password)

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex min-w-0 flex-1 gap-1.5" aria-hidden="true">
        {Array.from({ length: SEGMENTS }, (_, index) => (
          <span
            key={index}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              index < score ? 'bg-primary' : 'bg-border',
            )}
          />
        ))}
      </div>

      {score > 0 && (
        <span className={cn('text-caption shrink-0 font-medium', LABEL_COLOR[score])}>
          {LABEL[score]}
        </span>
      )}
    </div>
  )
}
