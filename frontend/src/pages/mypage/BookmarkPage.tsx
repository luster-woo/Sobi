import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import FilterChip from '@/components/common/FilterChip'
import PageTitle from '@/components/common/PageTitle'
import ProductRow from '@/components/common/ProductRow'
import { mockLoans } from '@/mocks/loans.mock'
import { mockSupports } from '@/mocks/supports.mock'
import { dday, formatMonthDay } from '@/utils/format'

type Kind = 'all' | 'loan' | 'support'

/** 18-1. 관심 목록 */
export default function BookmarkPage() {
  const navigate = useNavigate()
  const [kind, setKind] = useState<Kind>('all')
  const [loans, setLoans] = useState(mockLoans.filter((l) => l.bookmarked))
  const [supports, setSupports] = useState(mockSupports.filter((s) => s.bookmarked))

  const rows = [
    ...supports.map((s) => ({
      key: s.id,
      kind: 'support' as const,
      name: s.name,
      agency: `지원사업 · ${s.agency}`,
      tags: s.deadline
        ? [...s.tags.slice(0, 1), `~ ${formatMonthDay(s.deadline)} · D-${dday(s.deadline)}`]
        : s.tags,
      metrics: [{ label: '지원 금액', value: s.amountLabel }],
      judgement: s.judgement,
      deadline: s.deadline,
      to: `/supports/${s.id}`,
      toggle: () => setSupports((xs) => xs.filter((x) => x.id !== s.id)),
    })),
    ...loans.map((l) => ({
      key: l.id,
      kind: 'loan' as const,
      name: l.name,
      agency: `대출 · ${l.agency}`,
      tags: l.deadline
        ? [...l.tags.slice(0, 1), `~ ${formatMonthDay(l.deadline)} · D-${dday(l.deadline)}`]
        : l.tags,
      metrics: [{ label: '금리', value: `연 ${l.rate.toFixed(1)}%` }],
      judgement: l.judgement,
      deadline: l.deadline,
      to: `/loans/${l.id}`,
      toggle: () => setLoans((xs) => xs.filter((x) => x.id !== l.id)),
    })),
  ]
    .filter((r) => kind === 'all' || r.kind === kind)
    .sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'))

  return (
    <div className="space-y-5">
      <PageTitle
        crumbs={[{ label: '마이페이지', to: '/mypage' }, { label: '관심 목록' }]}
        title="관심 목록"
      />

      <div className="flex items-center gap-2">
        <FilterChip active={kind === 'all'} onClick={() => setKind('all')}>
          전체 {loans.length + supports.length}
        </FilterChip>
        <FilterChip active={kind === 'loan'} onClick={() => setKind('loan')}>
          대출 {loans.length}
        </FilterChip>
        <FilterChip active={kind === 'support'} onClick={() => setKind('support')}>
          지원사업 {supports.length}
        </FilterChip>
        <span className="typo-body2 text-text-muted ml-3">
          정렬 <span className="text-text">마감 임박 순</span>
        </span>
      </div>

      <div className="space-y-3">
        {rows.map((r) => (
          <ProductRow
            key={r.key}
            name={r.name}
            agency={r.agency}
            tags={r.tags}
            metrics={r.metrics}
            judgement={r.judgement}
            bookmarked
            onClick={() => navigate(r.to)}
            onToggleBookmark={r.toggle}
          />
        ))}
        {rows.length === 0 && (
          <p className="typo-body2 text-text-muted py-16 text-center">관심 목록이 비어 있어요</p>
        )}
      </div>
    </div>
  )
}
