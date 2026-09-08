import type { InputHTMLAttributes, ReactNode } from 'react'
import { useId } from 'react'

import { cn } from '@/shared/utils/cn'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  /** 입력칸 아래 안내 문구. error 가 있으면 가려집니다 */
  helperText?: string
  /** 에러 메시지. 값이 있으면 빨간 테두리 + 이 문구를 표시합니다 */
  error?: string
  /** 오른쪽 끝에 붙일 요소 (비밀번호 보기, 타이머 등) */
  rightSlot?: ReactNode
  /** 바깥 래퍼에 적용할 클래스 (폭 지정용) */
  className?: string
}

/**
 * 검증 규약: error 에 문자열이 들어오면 에러 상태, 없으면 정상.
 * validateXxx() 의 반환값(string | null)을 그대로 넘기면 됩니다.
 *   error={passwordError ?? undefined}
 */
export default function Input({
  label,
  helperText,
  error,
  rightSlot,
  disabled,
  id,
  className,
  ...rest
}: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const messageId = `${inputId}-message`

  const hasError = Boolean(error)
  const message = error ?? helperText

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <label htmlFor={inputId} className="font-heading text-body2 text-text font-semibold">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          id={inputId}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={message ? messageId : undefined}
          className={cn(
            'text-body1 text-text h-11 w-full rounded-md border px-3.5 transition-colors',
            'placeholder:text-text-disabled',
            'disabled:bg-surface-muted disabled:text-text-disabled disabled:cursor-not-allowed',
            hasError
              ? 'border-danger focus:border-danger'
              : 'border-border-strong bg-surface focus:border-primary',
            rightSlot ? 'pr-11' : undefined,
          )}
          {...rest}
        />

        {rightSlot && (
          <span className="text-text-muted absolute inset-y-0 right-3.5 flex items-center">
            {rightSlot}
          </span>
        )}
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
