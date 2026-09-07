import type { ReactNode } from 'react'

type Variant = 'soft' | 'solid' | 'dot'
type Tone = 'primary' | 'warning' | 'danger' | 'neutral'

interface BadgeProps {
  variant?: Variant
  tone?: Tone
  children: ReactNode
  className?: string
}

const softClass: Record<Tone, string> = {
  primary: 'bg-primary-soft text-primary-active',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-bg text-text-secondary',
}

const solidClass: Record<Tone, string> = {
  primary: 'bg-primary text-white',
  warning: 'bg-warning text-white',
  danger: 'bg-danger text-white',
  neutral: 'bg-secondary text-white',
}

const dotColor: Record<Tone, string> = {
  primary: 'bg-primary-active',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-text-secondary',
}

export default function Badge({
  variant = 'soft',
  tone = 'primary',
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={[
        'typo-badge inline-flex h-6 items-center gap-1.5 rounded-full px-2.5',
        variant === 'solid' ? solidClass[tone] : softClass[tone],
        className,
      ].join(' ')}
    >
      {variant === 'dot' && <span className={`size-1.5 rounded-full ${dotColor[tone]}`} />}
      {children}
    </span>
  )
}
