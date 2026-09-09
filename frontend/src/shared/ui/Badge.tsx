import type { ReactNode } from 'react'

import { cn } from '@/shared/utils/cn'

export type BadgeVariant = 'success' | 'progress' | 'warning' | 'neutral' | 'outline' | 'danger'

type Variant = BadgeVariant

interface BadgeProps {
  /**
   * 색은 상태 이름이 아니라 "누가 무엇을 해야 하는가"로 고른다 (index.css 참고).
   *
   * success  끝났고 결과가 좋다      승인 · 검증 통과 · 가입 완료 · 가능
   * progress 서버가 처리 중이다      심사 중 · 검증 중 · 초안 작성 중
   * warning  사용자가 조치해야 한다   확인 필요 · 마감 임박
   * danger   실패했거나 리스크가 있다 반려 · 검증 실패 · 가입 필요
   * neutral  접수됐고 할 일이 없다    신청 완료
   * outline  아직 시작하지 않았다     미제출 · 미작성 · 불가 · 가입 제외
   */
  variant?: Variant
  children: ReactNode
  className?: string
}

const variantClass: Record<Variant, string> = {
  success: 'bg-primary text-text-inverse',
  progress: 'bg-progress-soft text-progress',
  warning: 'bg-warning-soft text-warning',
  neutral: 'bg-bg-canvas text-text-secondary',
  outline: 'bg-surface text-text-muted border-border-strong border',
  danger: 'bg-danger-soft text-danger',
}

/** 상태를 한 단어로 알리는 알약. 색만으로 구분하지 않게 문구가 항상 함께 들어간다 */
export default function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'text-caption inline-flex h-[21px] shrink-0 items-center rounded-full px-2 font-medium whitespace-nowrap',
        variantClass[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
