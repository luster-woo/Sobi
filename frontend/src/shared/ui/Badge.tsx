import type { ReactNode } from 'react'

import { cn } from '@/shared/utils/cn'

export type BadgeVariant =
  | 'ready'
  | 'positive'
  | 'success'
  | 'progress'
  | 'todo'
  | 'warning'
  | 'neutral'
  | 'outline'
  | 'danger'

type Variant = BadgeVariant

interface BadgeProps {
  /**
   * 색은 상태 이름이 아니라 "누가 무엇을 해야 하는가"로 고른다 (index.css 참고).
   *
   * ready     시작할 수 있다          가능                        연초록 채움
   * positive  좋은 결과가 나왔다      승인 · 선정                  연초록 채움 (ready 와 같다)
   * success   끝났고 결과가 좋다      실행 완료 · 지급 완료 · 검증 통과 · 가입 완료   진초록 채움
   * progress  서버가 처리 중이다      심사 중 · 검증 중 · 초안 작성 중
   * todo      내가 이어서 해야 한다   작성 중 · 신청 준비중         주황 테두리
   * warning   확인이 필요하다         확인 필요 · 마감 임박         주황 채움
   * danger    실패했거나 리스크가 있다 반려 · 불가 · 검증 실패 · 가입 필요
   * neutral   접수됐고 할 일이 없다    신청 완료
   * outline   아직 시작하지 않았다     미제출 · 미작성 · 가입 제외
   *
   * 초록은 연초록 → 진초록으로 단계가 올라간다. 마지막 단계(지급·실행 완료)만
   * 대표색으로 꽉 채운다.
   *
   * ready 와 positive 가 같은 색인 건 알고 둔 것이다. 승인·선정은 심사가 끝나고
   * 지급되기 전 짧은 구간이라 실제로 거의 노출되지 않는다 — 가능과 겹쳐도 헷갈릴
   * 일이 없다고 정했다. 그래도 이름을 따로 두는 이유는, 나중에 갈라야 할 때 매핑
   * 표를 안 건드리고 여기 한 줄만 바꾸면 되게 하려는 것이다.
   *
   * 주황은 테두리(작성 중) → 채움(확인 필요). 둘 다 사용자가 움직여야 하는 상태라
   * 같은 계열에 두고, 테두리로 가른다.
   */
  variant?: Variant
  children: ReactNode
  className?: string
}

const variantClass: Record<Variant, string> = {
  ready: 'bg-success-soft text-success',
  positive: 'bg-success-soft text-success',
  success: 'bg-primary text-text-inverse',
  progress: 'bg-progress-soft text-progress',
  todo: 'bg-surface text-warning border-warning border',
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
