import type { InputHTMLAttributes, ReactNode, Ref } from 'react'
import { useId } from 'react'

import { CONTROL_HEIGHT } from '@/shared/ui/controlSize'
import { cn } from '@/shared/utils/cn'

const sizeClass = {
  sm: `text-body2 ${CONTROL_HEIGHT.sm} px-3`,
  md: `text-body1 ${CONTROL_HEIGHT.md} px-3`,
  lg: `text-body1 ${CONTROL_HEIGHT.lg} px-4`,
  xl: `text-h4 ${CONTROL_HEIGHT.xl} px-4`,
} as const

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** sm 34 · md 42 · lg 48 · xl 56 (px). Button·Select 와 같은 높이입니다 */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  label?: string
  /** 입력칸 아래 안내 문구. error 가 있으면 가려집니다 */
  helperText?: string
  /** 에러 메시지. 값이 있으면 빨간 테두리 + 이 문구를 표시합니다 */
  error?: string
  /** 오른쪽 끝에 붙일 요소 (비밀번호 보기, 타이머 등) */
  rightSlot?: ReactNode
  /** 바깥 래퍼에 적용할 클래스 (폭 지정용) */
  className?: string
  /** input 요소에 연결됩니다. 검증 실패 시 포커스를 옮길 때 씁니다 */
  ref?: Ref<HTMLInputElement>
}

/**
 * 검증 규약: error 에 문자열이 들어오면 에러 상태, 없으면 정상.
 * validateXxx() 의 반환값(string | null)을 그대로 넘기면 됩니다.
 *   error={passwordError ?? undefined}
 */
export default function Input({
  size = 'md',
  label,
  helperText,
  error,
  rightSlot,
  disabled,
  required,
  id,
  className,
  ref,
  ...rest
}: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const messageId = `${inputId}-message`

  const hasError = Boolean(error)
  const message = error ?? helperText

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={inputId} className="font-heading text-body2 text-text font-semibold">
          {label}
          {/* 폼에 noValidate 를 걸어도 required 는 낭독기에 필수 항목임을 알린다 */}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          required={required}
          aria-invalid={hasError || undefined}
          aria-describedby={message ? messageId : undefined}
          className={cn(
            'text-text w-full rounded-sm border transition-colors',
            sizeClass[size],
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
