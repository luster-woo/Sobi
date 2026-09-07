import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import SearchBar from '@/shared/ui/SearchBar'
import FilterChip from '@/shared/ui/FilterChip'
import ProductRow from '@/shared/ui/ProductRow'
import Pagination from '@/shared/ui/Pagination'
import SupportDetailModal from './SupportDetailModal'
import { mockSupports } from '@/mocks/supports.mock'
import { dday, formatMonthDay } from '@/shared/lib/format'

export function supportMetrics(s: (typeof mockSupports)[number]) {
  return [
    { label: '지원 금액', value: s.amountLabel },
    { label: '접수 기간', value: s.deadline ? `D-${dday(s.deadline)}` : '상시' },
  ]
}

/** 14. 지원금 조회 (+ 14-1 상세 모달) */
export default function SupportListPage() {
  const navigate = useNavigate()
  const { programId } = useParams()
  const [items, setItems] = useState(mockSupports)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const toggleBookmark = (id: string) =>
    setItems((xs) => xs.map((s) => (s.id === id ? { ...s, bookmarked: !s.bookmarked } : s)))

  const selected = items.find((s) => s.id === programId) ?? null

  return (
    <div className="space-y-4">
      <SearchBar
        value={query}
        onChange={setQuery}
        onSubmit={() => query && navigate(`/supports/search?q=${encodeURIComponent(query)}`)}
        placeholder="공고명·키워드로 검색해 보세요 — 예: 키오스크, 인건비, 임차료"
      />

      <div className="flex items-center gap-2">
        <FilterChip dropdown>지원 유형</FilterChip>
        <FilterChip dropdown>소관 기관</FilterChip>
        <FilterChip dropdown>판정 결과</FilterChip>
        <FilterChip dropdown>즐겨찾기만</FilterChip>
        <span className="ml-3 typo-body2 text-text-muted">
          정렬 <span className="text-text">지원 금액 높은 순</span>
        </span>
      </div>

      <div className="flex items-center justify-between">
        <p className="typo-body2">내 자격 기준 · 전체 32건 · 신규 3건 포함</p>
        <p className="typo-caption text-text-muted">가능 12 · 불가 20</p>
      </div>

      <div className="space-y-3">
        {items.map((s) => (
          <ProductRow
            key={s.id}
            name={s.name}
            agency={s.agency}
            tags={s.deadline ? [...s.tags, `~ ${formatMonthDay(s.deadline)}`] : s.tags}
            metrics={supportMetrics(s)}
            judgement={s.judgement}
            bookmarked={s.bookmarked}
            onClick={() => navigate(`/supports/${s.id}`)}
            onToggleBookmark={() => toggleBookmark(s.id)}
          />
        ))}
      </div>

      <Pagination page={page} total={7} onChange={setPage} />

      <SupportDetailModal support={selected} onClose={() => navigate('/supports')} onToggleBookmark={toggleBookmark} />
    </div>
  )
}
