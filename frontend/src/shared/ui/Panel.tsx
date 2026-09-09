import type { ReactNode } from 'react'

import { cn } from '@/shared/utils/cn'

interface PanelProps {
  children: ReactNode
  className?: string
}

/**
 * 시안의 .panel — 흰 프레임.
 *
 * 목록 화면은 검색창·필터·표·페이지네이션이 이 프레임 하나에 들어갑니다.
 * 안쪽 여백은 영역마다 달라서 여기서 주지 않고 각 영역이 갖습니다.
 */
export default function Panel({ children, className }: PanelProps) {
  return (
    <div className={cn('border-border bg-surface rounded-md border', className)}>{children}</div>
  )
}