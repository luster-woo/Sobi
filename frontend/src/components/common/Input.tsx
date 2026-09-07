import type { InputHTMLAttributes, ReactNode } from 'react'
import { useId } from 'react'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  /** 입력칸 아래 안내 문구 */
  helperText?: string
  /** 문자열을 주면 에러 상태 + 그 문구가 helperText 대신 표시됨 */
  error?: string
  /** 오른쪽 끝에 붙일 요소 (비밀번호 보기 아이콘 등) */
  rightSlot?: ReactNode
  className?: string
}

export default function Input({
  label,
  helperText,
  error,
  rightSlot,
  disabled,
  id,
  className = '',
  ...rest
}: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const hasError = Boolean(error)
  const message = error ?? helperText

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="typo-label-sm text-text">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          id={inputId}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          className={[
            'typo-body1 text-text h-11 w-full rounded-md border px-3.5 transition-colors',
            'placeholder:text-text-disabled',
            'disabled:bg-surface-muted disabled:text-text-disabled disabled:cursor-not-allowed',
            hasError
              ? 'border-danger focus:border-danger'
              : 'border-border-strong bg-surface focus:border-primary',
            rightSlot ? 'pr-11' : '',
          ].join(' ')}
          {...rest}
        />

        {rightSlot && (
          <span className="text-text-muted absolute inset-y-0 right-3.5 flex items-center">
            {rightSlot}
          </span>
        )}
      </div>

      {message && (
        <p className={`typo-caption ${hasError ? 'text-danger' : 'text-text-muted'}`}>{message}</p>
      )}
    </div>
  )
}
