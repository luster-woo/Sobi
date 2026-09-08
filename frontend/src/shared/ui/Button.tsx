import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/shared/utils/cn'

type Variant = 'primary' | 'secondary' | 'outline' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  /** sm 36 · md 44 · lg 48 (px) */
  size?: Size
  /** 스피너 표시 + 클릭 차단 */
  loading?: boolean
  children: ReactNode
}

const variantClass: Record<Variant, string> = {
  primary: 'bg-primary text-text-inverse hover:bg-primary-hover active:bg-primary-active',
  secondary: 'bg-secondary text-text-inverse hover:bg-secondary-hover',
  outline: 'border-border-strong bg-surface text-text hover:bg-surface-muted border',
  danger: 'bg-danger text-text-inverse hover:bg-danger-hover',
}

const sizeClass: Record<Size, string> = {
  sm: 'h-9 px-4 text-body2',
  md: 'h-11 px-5 text-body1',
  lg: 'h-12 px-6 text-body1',
}

/**
 * 디자인 보드 Button 스펙.
 *
 * type 은 기본값이 'button' 입니다. 폼 제출 버튼에는 명시적으로 type="submit" 을 넘기세요.
 * (HTML 기본값인 'submit' 을 그대로 두면 의도치 않은 폼 제출이 발생합니다)
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'font-heading inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  )
}
