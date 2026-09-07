import type { ReactNode } from 'react'
import Card from './Card'
import { cn } from '@/shared/lib/format'

interface StatCardProps {
  value: ReactNode
  label: ReactNode
  /** 라벨을 값 위에 둘지 (연동 계좌 화면 스타일) */
  labelFirst?: boolean
  className?: string
}

/** 큰 숫자 + 설명 한 줄. 상권 분석·진행 현황·상환 관리 상단 요약에 사용 */
export default function StatCard({ value, label, labelFirst = false, className = '' }: StatCardProps) {
  return (
    <Card className={cn('flex flex-col gap-1.5', labelFirst && 'flex-col-reverse', className)}>
      <p className="font-heading text-[22px] leading-[30px] font-semibold text-text">{value}</p>
      <p className="typo-caption text-text-muted">{label}</p>
    </Card>
  )
}
