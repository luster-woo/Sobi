import type { ReactNode } from 'react'

type Variant = 'elevated' | 'flat' | 'soft'

interface CardProps {
  variant?: Variant
  children: ReactNode
  className?: string
}

const variantClass: Record<Variant, string> = {
  elevated: 'bg-surface border border-border shadow-card',
  flat: 'bg-surface-muted',
  soft: 'bg-primary-soft',
}

export default function Card({ variant = 'elevated', children, className = '' }: CardProps) {
  return (
    <div className={['p-card rounded-lg', variantClass[variant], className].join(' ')}>
      {children}
    </div>
  )
}

/* ---------- 카드 안에서 쓰는 조각들 ---------- */

interface CardHeaderProps {
  title: ReactNode
  /** 오른쪽에 붙일 요소 (보통 Badge) */
  right?: ReactNode
  className?: string
}

export function CardHeader({ title, right, className = '' }: CardHeaderProps) {
  return (
    <div className={`flex items-center justify-between gap-2 ${className}`}>
      <h3 className="typo-h4">{title}</h3>
      {right}
    </div>
  )
}

export function CardDivider({ className = '' }: { className?: string }) {
  return <hr className={`bg-border-subtle h-px border-0 ${className}`} />
}

interface CardRowProps {
  label: ReactNode
  value: ReactNode
  /** 금액처럼 강조가 필요한 값이면 true */
  strong?: boolean
  className?: string
}

export function CardRow({ label, value, strong = false, className = '' }: CardRowProps) {
  return (
    <div className={`flex items-center justify-between gap-2 ${className}`}>
      <span className="typo-caption text-text-muted">{label}</span>
      <span
        className={
          strong
            ? 'font-heading text-caption text-text font-semibold'
            : 'typo-caption text-text-secondary'
        }
      >
        {value}
      </span>
    </div>
  )
}
