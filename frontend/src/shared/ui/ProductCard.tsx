import Card from './Card'
import Tag from './Tag'
import BookmarkButton from './BookmarkButton'

interface ProductCardProps {
  /** 줄바꿈은 \n */
  name: string
  tags: string[]
  metricLabel: string
  metricValue: string
  bookmarked: boolean
  onClick?: () => void
  onToggleBookmark?: () => void
}

/** 대시보드 "지원 가능한 대출/지원금" 카드 — 카로셀 안에서 높이를 서로 맞춘다 */
export default function ProductCard({
  name,
  tags,
  metricLabel,
  metricValue,
  bookmarked,
  onClick,
  onToggleBookmark,
}: ProductCardProps) {
  return (
    <Card className="relative flex h-full flex-col p-4">
      <BookmarkButton active={bookmarked} onToggle={onToggleBookmark} className="absolute right-2 top-2" />

      <button type="button" onClick={onClick} className="pr-8 text-left">
        <p className="typo-h4 whitespace-pre-line leading-[22px]">{name}</p>
      </button>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <Tag key={t}>{t}</Tag>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border-subtle pt-3">
        <span className="typo-caption text-text-muted">{metricLabel}</span>
        <span className="typo-label-sm">{metricValue}</span>
      </div>
    </Card>
  )
}
