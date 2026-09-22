import type { ReactNode } from 'react'

import { cn } from '@/shared/utils/cn'

interface PanelProps {
  /**
   * 있으면 시안의 .p-head — 아래 실선으로 구분되는 제목 줄을 그린다.
   * 없으면 예전처럼 프레임만 그린다 (목록 화면의 검색창+표 묶음이 그 경우다).
   */
  title?: string
  /** 제목 오른쪽. 배지나 부가 숫자가 들어간다 */
  headerRight?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * 시안의 .panel — 흰 프레임.
 *
 * 목록 화면은 검색창·필터·표·페이지네이션이 이 프레임 하나에 들어갑니다.
 * 안쪽 여백은 영역마다 달라서 여기서 주지 않고 각 영역이 갖습니다. 표가 들어가는
 * 패널은 여백이 0 이어야 하고 막대가 들어가는 패널은 여백이 필요해서, 규격을
 * 하나로 잡을 수가 없습니다.
 */
export default function Panel({ title, headerRight, children, className }: PanelProps) {
  return (
    <div className={cn('border-border bg-surface rounded-md border', className)}>
      {title && (
        <div className="border-border-subtle px-card flex items-baseline justify-between gap-3 border-b py-3">
          <h3 className="text-text text-body2 font-bold">{title}</h3>
          {headerRight}
        </div>
      )}

      {children}
    </div>
  )
}
