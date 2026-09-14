import { cn } from '@/shared/utils/cn'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** 화면에 라벨이 따로 있으면 그 문구를 넣는다. 낭독기가 무엇을 켜는지 알아야 한다 */
  label: string
  disabled?: boolean
  className?: string
}

/**
 * 켜고 끄는 스위치 (시안의 .sw).
 *
 * `role="switch"` 를 단 button 이다. 체크박스로 만들면 낭독기가 "선택됨" 이라고 읽는데,
 * 알림 설정처럼 즉시 적용되는 것은 "켜짐/꺼짐" 으로 읽혀야 한다.
 *
 * 확인 버튼 없이 누르는 즉시 반영되는 자리에만 쓴다. 폼 안에서 저장 버튼을 눌러야
 * 적용되는 값이라면 Checkbox 가 맞다.
 */
export default function Switch({ checked, onChange, label, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'focus-visible:outline-primary relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-border-strong',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'bg-surface size-[18px] rounded-full shadow-sm transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}
