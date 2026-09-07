import type { ReactNode } from 'react'
import type { Judgement } from '@/shared/types'
import Card from './Card'
import Tag from './Tag'
import JudgementBadge from './JudgementBadge'
import BookmarkButton from './BookmarkButton'
import { cn } from '@/shared/lib/format'

export interface Metric {
  label: string
  value: ReactNode
}

interface ProductRowProps {
  name: string
  agency: string
  tags: string[]
  metrics: Metric[]
  judgement: Judgement
  bookmarked: boolean
  onClick?: () => void
  onToggleBookmark?: () => void
  className?: string
}

/**
 * 대출·지원금·관심 목록의 가로형 상품 행.
 * 지표(금리·한도)는 상품명 줄에 맞춰 위쪽 정렬하고,
 * 판정 배지와 북마크만 카드 높이 기준으로 세로 중앙에 둔다.
 */
export default function ProductRow({
  name,
  agency,
  tags,
  metrics,
  judgement,
  bookmarked,
  onClick,
  onToggleBookmark,
  className = '',
}: ProductRowProps) {
  return (
    <Card
      className={cn(
        'flex gap-6 px-5 py-4 transition-shadow',
        onClick && 'cursor-pointer hover:border-border-strong hover:shadow-card',
        className,
      )}
    >
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-start gap-6 text-left">
        <div className="min-w-0 flex-1">
          <p className="typo-h4 truncate">{name}</p>
          <p className="mt-1 typo-caption text-text-muted">{agency}</p>
          {tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>
          )}
        </div>

        {metrics.map((m) => (
          <div key={m.label} className="w-[110px] shrink-0">
            <p className="typo-caption text-text-muted">{m.label}</p>
            <p className="mt-1 typo-h4 font-semibold">{m.value}</p>
          </div>
        ))}
      </button>

      <div className="flex shrink-0 items-center gap-2 self-center">
        <JudgementBadge value={judgement} />
        <BookmarkButton active={bookmarked} onToggle={onToggleBookmark} />
      </div>
    </Card>
  )
}
