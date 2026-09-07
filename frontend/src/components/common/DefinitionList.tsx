import type { ReactNode } from 'react'

import { cn } from '@/utils/format'

export interface Definition {
  label: string
  value: ReactNode
}

interface DefinitionListProps {
  items: Definition[]
  /** 라벨 컬럼 폭 */
  labelWidth?: number
  size?: 'md' | 'sm'
  className?: string
}

/** "금리  연 3.4%" 처럼 라벨-값 세로 나열 (상세 모달·입금 내역) */
export default function DefinitionList({
  items,
  labelWidth = 88,
  size = 'md',
  className = '',
}: DefinitionListProps) {
  return (
    <dl className={cn('space-y-2.5', className)}>
      {items.map((it) => (
        <div key={it.label} className="flex items-baseline gap-4">
          <dt
            className={cn(
              'text-text-muted shrink-0',
              size === 'md' ? 'typo-body2' : 'typo-caption',
            )}
            style={{ width: labelWidth }}
          >
            {it.label}
          </dt>
          <dd
            className={cn('text-text min-w-0 flex-1', size === 'md' ? 'typo-body1' : 'typo-body2')}
          >
            {it.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
