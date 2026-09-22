import type { Ref, SelectHTMLAttributes } from 'react'
import { useId } from 'react'

import { cn } from '@/shared/utils/cn'

interface Option {
  value: string
  label: string
}

const sizeClass = {
  lg: 'text-h4 h-14 px-4 pr-11',
  md: 'text-body1 h-[42px] px-3 pr-10',
  sm: 'text-body2 h-[30px] px-3 pr-8',
} as const

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children' | 'size'> {
  label?: string
  options: Option[]
  /** lg 56 · md 42 · sm 30 (px). sm 은 필터 바의 칩, lg 는 큰 창의 폼 */
  size?: 'lg' | 'md' | 'sm'
  placeholder?: string
  helperText?: string
  error?: string
  className?: string
  /** select 요소에 연결됩니다. 검증 실패 시 포커스를 옮길 때 씁니다 */
  ref?: Ref<HTMLSelectElement>
}

/**
 * 네이티브 select 기반입니다.
 * 키보드 조작·모바일 휠 선택이 브라우저가 제공하는 대로 동작합니다.
 * 커스텀 드롭다운(검색·다중선택)이 필요해지면 그때 별도 컴포넌트로 만듭니다.
 */
export default function Select({
  label,
  options,
  size = 'md',
  placeholder,
  helperText,
  error,
  disabled,
  required,
  id,
  className,
  ref,
  ...rest
}: SelectProps) {
  const autoId = useId()
  const selectId = id ?? autoId
  const messageId = `${selectId}-message`

  const hasError = Boolean(error)
  const message = error ?? helperText

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={selectId} className="font-heading text-body2 text-text font-semibold">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          required={required}
          aria-invalid={hasError || undefined}
          aria-describedby={message ? messageId : undefined}
          className={cn(
            'text-text w-full appearance-none rounded-sm border transition-colors',
            sizeClass[size],
            'disabled:bg-surface-muted disabled:text-text-disabled disabled:cursor-not-allowed',
            hasError
              ? 'border-danger focus:border-danger'
              : 'border-border-strong bg-surface focus:border-primary',
          )}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="text-text-muted pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>

      {message && (
        <p
          id={messageId}
          className={cn('text-caption', hasError ? 'text-danger' : 'text-text-muted')}
        >
          {message}
        </p>
      )}
    </div>
  )
}
