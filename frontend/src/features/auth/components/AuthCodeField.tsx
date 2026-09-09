import { useId } from 'react'

import Button from '@/shared/ui/Button'
import Input from '@/shared/ui/Input'
import { cn } from '@/shared/utils/cn'
import { formatCountdown } from '@/shared/utils/formatters'

/** 남은 시간이 이 값 아래로 내려가면 타이머를 빨갛게 표시한다 */
const SOON_SECONDS = 60

interface AuthCodeFieldProps {
  label?: string
  value: string
  onChange: (value: string) => void
  /** 남은 초. 0 이면 타이머를 그리지 않는다 */
  remaining: number
  /** 오른쪽 버튼 문구. '확인' 또는 '재전송' */
  actionLabel: string
  onAction: () => void
  actionDisabled?: boolean
  actionLoading?: boolean
  error?: string
  helperText?: string
  /** 검증을 통과하면 입력과 버튼을 잠근다 */
  verified?: boolean
  className?: string
}

/**
 * 인증번호 입력 + 유효시간 + 오른쪽 버튼.
 *
 * 회원가입(04) · 비밀번호 재설정(05) · 휴대폰 본인인증(07) 세 화면이 쓴다.
 * 남은 시간 계산은 하지 않는다 — 화면이 `useCountdown` 으로 들고 있는 값을 받는다.
 * 필드가 타이머를 소유하면 재전송 시점을 화면에서 제어할 수 없다.
 *
 * 라벨을 Input 에 넘기지 않고 직접 그리는 이유: 라벨이 Input 안에 있으면
 * 오른쪽 버튼이 라벨·에러 문구까지 포함한 높이에 맞춰져 입력칸과 어긋난다.
 */
export default function AuthCodeField({
  label = '인증번호',
  value,
  onChange,
  remaining,
  actionLabel,
  onAction,
  actionDisabled,
  actionLoading,
  error,
  helperText,
  verified = false,
  className,
}: AuthCodeFieldProps) {
  const inputId = useId()

  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className="font-heading text-body2 text-text mb-2 block font-semibold"
      >
        {label}
        <span className="text-danger ml-0.5">*</span>
      </label>

      <div className="flex items-start gap-2">
        <Input
          id={inputId}
          className="min-w-0 flex-1"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="6자리 숫자"
          disabled={verified}
          value={value}
          // 숫자만 남긴다. 붙여넣기로 하이픈·공백이 섞여 들어오는 경우가 많다
          onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
          error={error}
          helperText={helperText}
          rightSlot={
            remaining > 0 ? (
              <span
                className={cn(
                  'text-body2 tabular-nums',
                  remaining <= SOON_SECONDS ? 'text-danger font-medium' : 'text-text-muted',
                )}
              >
                {formatCountdown(remaining)}
              </span>
            ) : undefined
          }
        />

        <Button
          variant="outline"
          onClick={onAction}
          disabled={actionDisabled || verified}
          loading={actionLoading}
          className="w-[104px] shrink-0 whitespace-nowrap"
        >
          {actionLabel}
        </Button>
      </div>
    </div>
  )
}
