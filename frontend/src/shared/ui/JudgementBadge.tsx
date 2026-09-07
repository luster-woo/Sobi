import type { Judgement } from '@/shared/types'
import { cn } from '@/shared/lib/format'

const map: Record<Judgement, { label: string; className: string }> = {
  possible: { label: '가능', className: 'bg-primary text-white' },
  impossible: { label: '불가', className: 'border border-dashed border-border-strong text-text-disabled' },
  applied: { label: '신청 완료', className: 'border border-border-strong text-text-secondary' },
  holding: { label: '보유 중', className: 'border border-border-strong text-text-secondary' },
}

/** 목록 우측 자격 판정 배지 — 가능(솔리드) / 불가(점선) / 신청 완료·보유 중(아웃라인) */
export default function JudgementBadge({ value, className = '' }: { value: Judgement; className?: string }) {
  const m = map[value]
  return (
    <span className={cn('inline-flex h-6 items-center rounded-full px-3 typo-badge', m.className, className)}>
      {m.label}
    </span>
  )
}
