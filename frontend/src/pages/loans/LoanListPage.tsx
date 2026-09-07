import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import Card from '@/components/common/Card'
import FilterChip from '@/components/common/FilterChip'
import Pagination from '@/components/common/Pagination'
import ProductRow from '@/components/common/ProductRow'
import ProgressBar from '@/components/common/ProgressBar'
import SearchBar from '@/components/common/SearchBar'
import Spinner from '@/components/common/Spinner'
import { mockLoans } from '@/mocks/loans.mock'
import { formatManWon, formatMonthDay } from '@/utils/format'

import LoanDetailModal from './LoanDetailModal'

const JUDGED_KEY = 'sobi.mock.loansJudged'

/** 12. 자격 판정 로딩 — 첫 진입 시 잠깐 보여줌 */
function JudgingLoading({ progress }: { progress: number }) {
  return (
    <div className="flex flex-col items-center pt-32">
      <Spinner />
      <h2 className="typo-h2 mt-8">내 사업체 기준으로 상품을 고르고 있어요</h2>
      <p className="typo-body2 text-text-muted mt-2">
        매출·업력·부채비율·신용등급을 상품 요건과 대조하는 중 ·약 10초
      </p>
      <Card className="mt-10 w-[420px] space-y-3">
        <div className="flex items-center justify-between">
          <span className="typo-label-sm">20개 상품 중 {Math.round(progress / 5)}개 판정 완료</span>
          <span className="typo-caption text-text-muted">{progress}%</span>
        </div>
        <ProgressBar value={progress} />
        <ul className="border-border-subtle typo-caption text-text-muted space-y-1.5 border-t pt-3">
          <li>✓ 사업자 정보 확인 완료</li>
          <li>✓ 마이데이터 최신본 불러오기 완료</li>
          <li>·상품별 자격 요건 대조 중...</li>
        </ul>
      </Card>
    </div>
  )
}

/** 13. 대출 상품 조회 (+ 13-1 상세 모달) */
export default function LoanListPage() {
  const navigate = useNavigate()
  const { loanId } = useParams()
  const [loans, setLoans] = useState(mockLoans)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [judging, setJudging] = useState(() => !sessionStorage.getItem(JUDGED_KEY))
  const [progress, setProgress] = useState(55)

  useEffect(() => {
    if (!judging) return
    const t = setInterval(() => setProgress((p) => Math.min(100, p + 9)), 250)
    return () => clearInterval(t)
  }, [judging])

  useEffect(() => {
    if (judging && progress >= 100) {
      sessionStorage.setItem(JUDGED_KEY, '1')
      const t = setTimeout(() => setJudging(false), 400)
      return () => clearTimeout(t)
    }
  }, [judging, progress])

  const toggleBookmark = (id: string) =>
    setLoans((xs) => xs.map((l) => (l.id === id ? { ...l, bookmarked: !l.bookmarked } : l)))

  const selected = loans.find((l) => l.id === loanId) ?? null
  const counts = {
    possible: loans.filter((l) => l.judgement === 'possible').length,
    holding: loans.filter((l) => l.judgement === 'holding').length,
    impossible: loans.filter((l) => l.judgement === 'impossible').length,
  }

  if (judging) return <JudgingLoading progress={progress} />

  return (
    <div className="space-y-4">
      <SearchBar value={query} onChange={setQuery} placeholder="상품명·취급 기관으로 찾기" />

      <div className="flex items-center gap-2">
        <FilterChip dropdown>판정 결과</FilterChip>
        <FilterChip dropdown>취급 기관</FilterChip>
        <FilterChip dropdown>즐겨찾기만</FilterChip>
        <span className="typo-body2 text-text-muted ml-3">
          정렬 <span className="text-text">금리 낮은 순</span>
        </span>
      </div>

      <div className="flex items-center justify-between">
        <p className="typo-body2">내 사업체 기준 · 전체 20개 상품</p>
        <p className="typo-caption text-text-muted">
          가능 5 · 보유 1 · 불가 14
          <span className="sr-only">
            (목업 데이터 {counts.possible}/{counts.holding}/{counts.impossible})
          </span>
        </p>
      </div>

      <div className="space-y-3">
        {loans
          .filter((l) => !query || l.name.includes(query) || l.agency.includes(query))
          .map((l) => (
            <ProductRow
              key={l.id}
              name={l.name}
              agency={l.agency}
              tags={l.deadline ? [...l.tags, `~ ${formatMonthDay(l.deadline)}`] : l.tags}
              metrics={[
                { label: '금리', value: `연 ${l.rate.toFixed(1)}%` },
                { label: '한도', value: formatManWon(l.limitAmount) },
              ]}
              judgement={l.judgement}
              bookmarked={l.bookmarked}
              onClick={() => navigate(`/loans/${l.id}`)}
              onToggleBookmark={() => toggleBookmark(l.id)}
            />
          ))}
      </div>

      <Pagination page={page} total={4} onChange={setPage} />

      <LoanDetailModal
        loan={selected}
        onClose={() => navigate('/loans')}
        onToggleBookmark={toggleBookmark}
      />
    </div>
  )
}
