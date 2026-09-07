import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Card from '@/shared/ui/Card'
import Badge from '@/shared/ui/Badge'
import Button from '@/shared/ui/Button'
import Select from '@/shared/ui/Select'
import Input from '@/shared/ui/Input'
import ProductCard from '@/shared/ui/ProductCard'
import CardCarousel from '@/shared/ui/CardCarousel'
import { IconCheckCircle, IconChevronRight, IconSearch } from '@/shared/ui/Icon'
import InsuranceModal from './InsuranceModal'
import { useRole } from '@/shared/lib/session'
import { mockInsurances, mockUser } from '@/mocks/user.mock'
import { mockDashboardLoans, mockPreDashboardLoans, type DashboardProduct } from '@/mocks/loans.mock'
import { mockDashboardSupports, mockPreDashboardSupports } from '@/mocks/supports.mock'
import { businessCodes, defaultMarketCondition } from '@/mocks/market.mock'
import type { Insurance } from '@/shared/types'
import { cn } from '@/shared/lib/format'

const SALES = [
  { m: '3월', v: 58 },
  { m: '4월', v: 66 },
  { m: '5월', v: 62 },
  { m: '6월', v: 56 },
  { m: '7월', v: 70 },
  { m: '8월', v: 82 },
]

const SUMMARY: { label: string; value: string; note: string }[] = [
  { label: '최근 월 매출', value: '3,240만 원', note: '전월 대비 +8%' },
  { label: '현금 흐름', value: '+12%', note: '3개월 연속 개선' },
  { label: '총 대출 잔액', value: '5,520만 원', note: '대출 2건' },
]

function ProductSection({
  title,
  linkLabel,
  to,
  items,
}: {
  title: string
  linkLabel: string
  to: string
  items: DashboardProduct[]
}) {
  const navigate = useNavigate()
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="typo-h4">{title}</h2>
        <Link to={to} className="typo-caption text-text-muted hover:text-text">
          {linkLabel}
        </Link>
      </div>
      <CardCarousel
        perView={3}
        items={items.map((p) => (
          <ProductCard key={p.id} {...p} onClick={() => navigate(to)} />
        ))}
      />
    </section>
  )
}

function InsuranceCard({
  items,
  compact = false,
  onSelect,
}: {
  items: Insurance[]
  compact?: boolean
  onSelect?: (i: Insurance) => void
}) {
  const missing = items.filter((i) => i.status === 'required').length
  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="typo-caption text-text-muted">업종별 필수 가입 항목</p>
          <p className="mt-0.5 typo-h4">{compact ? '의무보험 체크 리스트' : '의무보험'}</p>
        </div>
        {!compact && <span className="shrink-0 typo-body2 text-text-secondary">{missing}건 미가입</span>}
      </div>

      <ul className="space-y-3">
        {items.map((i) => (
          <li key={i.id}>
            {compact ? (
              <div className="flex items-center justify-between gap-2">
                <span className="typo-body2">✓ {i.name}</span>
                <span className="shrink-0 typo-caption text-text-muted">{i.law}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onSelect?.(i)}
                className="-mx-2 flex w-[calc(100%+16px)] items-start gap-3 rounded-md px-2 py-1 text-left transition-colors hover:bg-surface-muted"
              >
                {i.status === 'joined' ? (
                  <IconCheckCircle size={18} className="mt-0.5 shrink-0 text-primary" />
                ) : (
                  <span className="mt-0.5 size-[18px] shrink-0 rounded-full border-2 border-border-strong" />
                )}
                <span className="min-w-0">
                  <span className="block typo-body1">{i.name}</span>
                  <span className="mt-0.5 block typo-caption text-text-muted">
                    {i.law} · {i.status === 'joined' ? '가입 완료' : '가입 안내 보기'}
                  </span>
                </span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}

function NoticeCard({ items }: { items: [string, string][] }) {
  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="typo-caption text-text-muted">내 자격에 맞는 공고만</p>
          <p className="mt-0.5 typo-h4">새 공고 알림</p>
        </div>
        <Badge variant="solid">신규 3</Badge>
      </div>
      <ul className="space-y-2.5">
        {items.map(([t, d]) => (
          <li key={t}>
            <p className="typo-body2">· {t}</p>
            <p className="mt-0.5 pl-3 typo-caption text-text-muted">{d}</p>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** 10. 사업자 대시보드 */
function OwnerDashboard() {
  const [insurances, setInsurances] = useState(mockInsurances)
  const [selected, setSelected] = useState<Insurance | null>(null)

  const toggleStatus = (id: string) => {
    setInsurances((xs) =>
      xs.map((i) => (i.id === id ? { ...i, status: i.status === 'joined' ? 'required' : 'joined' } : i)),
    )
    setSelected(null)
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-6">
      <div className="space-y-6">
        {/* 내 사업장 정보 */}
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="typo-caption text-text-muted">마이데이터 · 2026. 9. 2 갱신</p>
              <p className="mt-0.5 typo-h4">내 사업장 정보</p>
            </div>
            <Badge variant="solid">연동 중</Badge>
          </div>

          <div className="mt-6 flex items-start gap-10">
            <div className="min-w-0 flex-1">
              <p className="typo-caption text-text-muted">최근 6개월 매출</p>
              <div className="mt-3 flex h-[76px] items-end gap-3">
                {SALES.map((s, i) => (
                  <div key={s.m} className="flex w-9 flex-col items-center gap-1.5">
                    <div
                      className={cn('w-full rounded-t-sm', i === SALES.length - 1 ? 'bg-primary' : 'bg-border')}
                      style={{ height: `${s.v}%` }}
                    />
                    <span className="typo-caption text-text-muted">{s.m}</span>
                  </div>
                ))}
              </div>
            </div>

            <dl className="w-[300px] shrink-0 space-y-4">
              {SUMMARY.map((r) => (
                <div key={r.label} className="flex items-end justify-between gap-4">
                  <div>
                    <dt className="typo-caption text-text-muted">{r.label}</dt>
                    <dd className="mt-0.5 font-heading text-[22px] leading-[30px] font-semibold">{r.value}</dd>
                  </div>
                  <span className="shrink-0 pb-1 typo-caption text-text-muted">{r.note}</span>
                </div>
              ))}
            </dl>
          </div>
        </Card>

        {/* 판정 요약 */}
        <Card className="space-y-5">
          <div className="flex items-center gap-4">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-background text-text-muted">
              <IconSearch size={18} />
            </span>
            <div>
              <p className="typo-h4">{mockUser.name} 님이 받을 수 있는 정책자금</p>
              <p className="mt-1 typo-caption text-text-muted">
                매출·업력·부채비율·신용등급을 상품 요건과 대조해 판정해요
              </p>
            </div>
          </div>
          <div className="grid grid-cols-4 divide-x divide-border-subtle border-t border-border-subtle pt-4 text-center">
            {[
              ['신청 가능', '18건'],
              ['마감 임박', '5건'],
              ['신청 불가', '34건'],
              ['전체', '52건'],
            ].map(([k, v]) => (
              <div key={k} className="space-y-1">
                <p className="typo-caption text-text-muted">{k}</p>
                <p className="typo-h4 font-semibold">{v}</p>
              </div>
            ))}
          </div>
        </Card>

        <ProductSection title="지원 가능한 대출" linkLabel="대출 자격 판정 전체 보기" to="/loans" items={mockDashboardLoans} />
        <ProductSection
          title="지원 가능한 정부 지원금"
          linkLabel="지원금 자격 판정 전체 보기"
          to="/supports"
          items={mockDashboardSupports}
        />
      </div>

      <div className="space-y-4">
        <InsuranceCard items={insurances} onSelect={setSelected} />

        <Card className="space-y-4">
          <Link to="/repayments" className="flex items-start justify-between gap-3">
            <div>
              <p className="typo-caption text-text-muted">다음 상환일 9. 15 · 13일 남음</p>
              <p className="mt-0.5 typo-h4">상환 관리</p>
            </div>
            <IconChevronRight size={16} className="mt-1 shrink-0 text-text-muted" />
          </Link>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['이번 달 상환액', '89만 원'],
              ['총 대출 잔액', '5,520만 원'],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="typo-caption text-text-muted">{k}</p>
                <p className="mt-0.5 font-heading text-[20px] leading-[28px] font-semibold">{v}</p>
              </div>
            ))}
          </div>
          <Card variant="flat" className="rounded-md p-3">
            <p className="typo-body2">매출이 5개월 연속 올랐어요</p>
            <p className="mt-0.5 typo-caption text-text-muted">금리 인하 요구 가능</p>
          </Card>
        </Card>

        <NoticeCard
          items={[
            ['스마트상점 기술보급', '8. 26 등록 · ~ 9. 12 마감'],
            ['대구 소상공인 이자 지원', '8. 25 등록 · ~ 10. 4 마감'],
          ]}
        />
      </div>

      <InsuranceModal item={selected} onClose={() => setSelected(null)} onToggleStatus={toggleStatus} />
    </div>
  )
}

/** 10-1. 예비창업자 대시보드 */
function PreDashboard() {
  const navigate = useNavigate()
  const [cond, setCond] = useState(defaultMarketCondition)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="typo-h1">어떤 가게를 준비 중이세요?</h2>
        <p className="mt-2 typo-body2 text-text-muted">입력한 조건으로 상권을 분석하고 필요한 지원금을 안내해요.</p>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-6">
        <div className="space-y-6">
          <Card className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <Select label="업종 대분류" options={businessCodes.large} value={cond.large} onChange={(e) => setCond({ ...cond, large: e.target.value })} />
              <Select label="업종 중분류" options={businessCodes.mid} value={cond.mid} onChange={(e) => setCond({ ...cond, mid: e.target.value })} />
              <Select label="업종 소분류" options={businessCodes.small} value={cond.small} onChange={(e) => setCond({ ...cond, small: e.target.value })} />
              <Select label="지역" options={businessCodes.regions} value={cond.region} onChange={(e) => setCond({ ...cond, region: e.target.value })} />
              <Input label="규모" value={cond.size} onChange={(e) => setCond({ ...cond, size: e.target.value })} />
              <Input label="예산" value={cond.budget} onChange={(e) => setCond({ ...cond, budget: e.target.value })} />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => navigate('/market')}>상권 분석하기</Button>
            </div>
          </Card>

          <ProductSection title="지원 가능한 대출" linkLabel="대출 전체 보기" to="/loans" items={mockPreDashboardLoans} />
          <ProductSection title="지원 가능한 정부 지원금" linkLabel="지원금 전체 보기" to="/supports" items={mockPreDashboardSupports} />
        </div>

        <div className="space-y-4">
          <Card className="space-y-4">
            <p className="typo-h4">사업자등록을 마치셨나요?</p>
            <Button className="w-full" onClick={() => navigate('/business/verify')}>
              사업자 인증하기
            </Button>
          </Card>
          <InsuranceCard items={mockInsurances} compact />
          <NoticeCard
            items={[
              ['대구 예비창업자 임차료 지원', '8. 28 등록 · ~ 11. 20 마감'],
              ['신사업창업사관학교 8기', '8. 24 등록 · ~ 10. 24 마감'],
            ]}
          />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const role = useRole()
  return role === 'pre' ? <PreDashboard /> : <OwnerDashboard />
}
