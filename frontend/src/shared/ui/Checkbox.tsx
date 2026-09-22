import type { InputHTMLAttributes, ReactNode, Ref } from 'react'
import { useId } from 'react'

import { cn } from '@/shared/utils/cn'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** 체크박스 오른쪽 라벨. 문자열 외에 링크·강조가 섞인 노드도 가능합니다 */
  label?: ReactNode
  /** 라벨 아래 보조 문구 */
  description?: string
  /** 바깥 래퍼 클래스 */
  className?: string
  /** input 요소에 연결됩니다. 검증 실패 시 포커스를 옮길 때 씁니다 */
  ref?: Ref<HTMLInputElement>
}

export default function Checkbox({
  label,
  description,
  disabled,
  id,
  className,
  ref,
  ...rest
}: CheckboxProps) {
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label
        htmlFor={inputId}
        className={cn(
          'inline-flex items-start gap-2',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        )}
      >
        <span className="relative mt-px inline-flex size-[18px] shrink-0">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            disabled={disabled}
            // 포커스 표시는 아래 네모(peer-focus-visible:ring)가 그린다.
            // 전역 outline 까지 붙으면 표시가 두 겹이 된다
            className="peer cursor-inherit absolute size-full opacity-0 focus-visible:outline-none"
            {...rest}
          />
          <span
            aria-hidden="true"
            className={cn(
              'border-border-strong bg-surface pointer-events-none absolute inset-0 rounded-[4px] border transition-colors',
              'peer-checked:border-primary peer-checked:bg-primary',
              'peer-focus-visible:ring-primary/40 peer-focus-visible:ring-2',
              'peer-disabled:opacity-50',
            )}
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="text-text-inverse pointer-events-none absolute inset-0 size-full scale-75 opacity-0 transition-opacity peer-checked:opacity-100"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m5 12 4.5 4.5L19 7" />
          </svg>
        </span>

        {label && <span className="text-body2 text-text">{label}</span>}
      </label>

      {description && <p className="text-caption text-text-muted pl-[26px]">{description}</p>}
    </div>
  )
}
