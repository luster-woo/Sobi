import BookmarkButton from './BookmarkButton'
import Card from './Card'
import Tag from './Tag'

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
      <BookmarkButton
        active={bookmarked}
        onToggle={onToggleBookmark}
        className="absolute top-2 right-2"
      />

      <button type="button" onClick={onClick} className="pr-8 text-left">
        <p className="typo-h4 leading-[22px] whitespace-pre-line">{name}</p>
      </button>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <Tag key={t}>{t}</Tag>
        ))}
      </div>

      <div className="border-border-subtle mt-auto flex items-center justify-between border-t pt-3">
        <span className="typo-caption text-text-muted">{metricLabel}</span>
        <span className="typo-label-sm">{metricValue}</span>
      </div>
    </Card>
  )
}
