import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import SearchBar from '@/shared/ui/SearchBar'
import ProductRow from '@/shared/ui/ProductRow'
import { mockSupports } from '@/mocks/supports.mock'
import { formatMonthDay } from '@/shared/lib/format'
import { supportMetrics } from './SupportListPage'

/** 14-3. 지원금 검색 결과 (자연어 검색) */
export default function SupportSearchPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const initial = params.get('q') ?? '키오스크 사려는데 관련된 지원금좀 찾아줘'
  const [query, setQuery] = useState(initial)
  const [items, setItems] = useState(mockSupports)

  // 목업: 자연어 검색 → 키워드 "키오스크"를 뽑아 관련 2건만 보여줌
  const keyword = initial.includes('키오스크') ? '키오스크' : initial.split(' ')[0]
  const results = items.filter((s) => ['sp-1', 'sp-4'].includes(s.id))

  const toggleBookmark = (id: string) =>
    setItems((xs) => xs.map((s) => (s.id === id ? { ...s, bookmarked: !s.bookmarked } : s)))

  return (
    <div className="space-y-4">
      <SearchBar
        value={query}
        onChange={setQuery}
        onSubmit={() => navigate(`/supports/search?q=${encodeURIComponent(query)}`)}
      />

      <div>
        <h2 className="typo-h3">검색 결과 {results.length}건</h2>
        <p className="mt-1 typo-caption text-text-muted">‘{keyword}’ 키워드가 포함된 공고예요 · 판정은 내 자격 기준</p>
      </div>

      <div className="space-y-3">
        {results.map((s) => (
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
    </div>
  )
}
