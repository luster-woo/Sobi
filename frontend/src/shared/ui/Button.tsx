import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'

import { cn } from '@/shared/utils/cn'

type Variant = 'primary' | 'secondary' | 'outline' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  /** sm 34 · md 42 · lg 48 (px) */
  size?: Size
  /** 스피너 표시 + 클릭 차단 */
  loading?: boolean
  children: ReactNode
  ref?: Ref<HTMLButtonElement>
}

const variantClass: Record<Variant, string> = {
  primary: 'bg-primary text-text-inverse hover:bg-primary-hover active:bg-primary-active',
  secondary: 'bg-secondary text-text-inverse hover:bg-secondary-hover',
  outline: 'border-border-strong bg-surface text-text hover:bg-surface-muted border',
  danger: 'bg-danger text-text-inverse hover:bg-danger-hover',
}

const sizeClass: Record<Size, string> = {
  sm: 'h-[34px] px-3 text-body2',
  md: 'h-[42px] px-4 text-body1',
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
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'font-heading inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-colors',
        // 시안의 비활성 버튼은 투명도가 아니라 색 자체가 다르다 (.btn-off)
        'disabled:bg-border-subtle disabled:text-text-disabled disabled:cursor-not-allowed disabled:border-transparent',
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
