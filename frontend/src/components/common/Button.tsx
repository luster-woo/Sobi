import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'outline' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}

const variantClass: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-active',
  secondary: 'bg-secondary text-white hover:bg-secondary-hover',
  outline: 'bg-surface text-text border border-border-strong hover:bg-surface-muted',
  danger: 'bg-danger text-white hover:bg-danger-hover',
}

const sizeClass: Record<Size, string> = {
  sm: 'h-9 px-4 typo-label-sm',
  md: 'h-11 px-5 typo-label',
  lg: 'h-12 px-6 typo-label',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  const isBlocked = disabled || loading

  return (
    <button
      disabled={isBlocked}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-md transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantClass[variant],
        sizeClass[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {loading && (
        <span className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
      )}
      {children}
    </button>
  )
}
