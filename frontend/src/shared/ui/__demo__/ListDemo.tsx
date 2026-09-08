import { useState } from 'react'
import { MemoryRouter, useLocation } from 'react-router'

import { useListParams } from '@/shared/hooks/useListParams'
import type { ApplicationStatus } from '@/shared/types/application'
import Checkbox from '@/shared/ui/Checkbox'
import EmptyState from '@/shared/ui/EmptyState'
import FilterBar from '@/shared/ui/FilterBar'
import Pagination from '@/shared/ui/Pagination'
import SearchBar from '@/shared/ui/SearchBar'
import Select from '@/shared/ui/Select'
import Table, { type Column } from '@/shared/ui/Table'
import { cn } from '@/shared/utils/cn'

/**
 * S15P21D101-171 확인용 데모.
 *
 * SearchBar / FilterBar / Table / Pagination + useListParams 를 실제로 조립해서
 * 눌러볼 수 있게 한 페이지입니다. 프로덕션 화면이 아닙니다.
 *
 * MemoryRouter 로 감싼 이유: useListParams 가 useSearchParams 를 쓰는데,
 * main.tsx 에서 App 대신 이 컴포넌트를 렌더하면 라우터 컨텍스트가 없어 터집니다.
 * 실제 화면은 이미 RouterProvider 안이라 감쌀 필요가 없습니다.
 *
 * 보는 방법: src/main.tsx 에서 App 대신 이 컴포넌트를 렌더 (그 변경은 커밋하지 마세요)
 */

const SIZE = 10
const FILTER_KEYS = ['q', 'status', 'onlyRejected', 'sort'] as const

interface DemoRow {
  id: number
  name: string
  agency: string
  status: ApplicationStatus
  createdAt: string
}

const AGENCIES = ['중소벤처기업부', '서울신용보증재단', '기업은행', '소진공']
const STATUSES: ApplicationStatus[] = ['SUBMITTED', 'REVIEWING', 'APPROVED', 'REJECTED']

const ALL_ROWS: DemoRow[] = Array.from({ length: 47 }, (_, index) => ({
  id: index + 1,
  name: `${AGENCIES[index % 4]} 소상공인 자금지원 ${index + 1}호`,
  agency: AGENCIES[index % 4],
  status: STATUSES[index % 4],
  createdAt: `2026-0${(index % 9) + 1}-1${index % 10}`,
}))

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  SUBMITTED: '신청 완료',
  REVIEWING: '심사 중',
  APPROVED: '승인',
  REJECTED: '반려',
}

const STATUS_CLASS: Record<ApplicationStatus, string> = {
  SUBMITTED: 'bg-surface-muted text-text-secondary',
  REVIEWING: 'bg-warning-soft text-warning',
  APPROVED: 'bg-success-soft text-success',
  REJECTED: 'bg-danger-soft text-danger',
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={cn(
        'text-caption inline-flex rounded-full px-2 py-0.5 font-semibold',
        STATUS_CLASS[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

const columns: Column<DemoRow>[] = [
  { key: 'name', header: '상품명', render: (row) => row.name },
  { key: 'agency', header: '기관', width: '160px', render: (row) => row.agency },
  {
    key: 'status',
    header: '진행 상태',
    width: '110px',
    render: (row) => <StatusBadge status={row.status} />,
  },
  {
    key: 'createdAt',
    header: '신청일',
    width: '110px',
    align: 'right',
    render: (row) => row.createdAt,
  },
]

const STATUS_OPTIONS = STATUSES.map((status) => ({ value: status, label: STATUS_LABEL[status] }))

const SORT_OPTIONS = [
  { value: 'createdAtDesc', label: '최신순' },
  { value: 'nameAsc', label: '상품명순' },
]

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-h3">{title}</h2>
        {hint && <p className="text-body2 text-text-muted mt-1">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

/** 실제 화면과 같은 방식으로 조립한 목록 */
function ConnectedList() {
  const { page, values, activeCount, setPage, setValues, reset } = useListParams({
    keys: FILTER_KEYS,
  })
  const location = useLocation()

  // 서버가 할 일을 데모에서만 흉내냅니다. 실제 화면은 이 필터링을 하지 않습니다.
  const filtered = ALL_ROWS.filter((row) => {
    if (values.q && !row.name.includes(values.q)) return false
    if (values.status && row.status !== values.status) return false
    if (values.onlyRejected === 'true' && row.status !== 'REJECTED') return false
    return true
  })

  const sorted =
    values.sort === 'nameAsc'
      ? [...filtered].sort((a, b) => a.name.localeCompare(b.name))
      : filtered

  const totalPages = Math.ceil(sorted.length / SIZE)
  const rows = sorted.slice((page - 1) * SIZE, page * SIZE)

  return (
    <div className="space-y-4">
      <div className="border-border bg-surface-muted text-caption rounded-md border px-3 py-2">
        <span className="text-text-muted">현재 URL: </span>
        <code className="text-text">/applications{location.search || '(쿼리 없음)'}</code>
      </div>

      <SearchBar
        value={values.q}
        onSubmit={(keyword) => setValues({ q: keyword || null })}
        placeholder="상품명 검색"
      />

      <FilterBar
        activeCount={activeCount}
        onReset={reset}
        sort={
          <Select
            options={SORT_OPTIONS}
            value={values.sort || 'createdAtDesc'}
            onChange={(event) => setValues({ sort: event.target.value })}
            className="w-36"
          />
        }
      >
        <Select
          label="진행 상태"
          placeholder="전체"
          options={STATUS_OPTIONS}
          value={values.status}
          onChange={(event) => setValues({ status: event.target.value || null })}
          className="w-40"
        />
        <Checkbox
          label="반려된 것만"
          checked={values.onlyRejected === 'true'}
          onChange={(event) => setValues({ onlyRejected: event.target.checked ? 'true' : null })}
        />
      </FilterBar>

      <p className="text-body2 text-text-secondary">
        총 {sorted.length}건 · {page} / {Math.max(totalPages, 1)} 페이지
      </p>

      <Table caption="내 신청 목록" columns={columns} rows={rows} getRowId={(row) => row.id} />

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}

function PaginationPlayground({
  totalPages,
  siblingCount,
}: {
  totalPages: number
  siblingCount?: number
}) {
  const [page, setPage] = useState(1)
  return (
    <div className="border-border bg-surface space-y-2 rounded-lg border p-4">
      <p className="text-caption text-text-muted">
        totalPages {totalPages} · siblingCount {siblingCount ?? 1} · 현재 {page}
      </p>
      <Pagination
        page={page}
        totalPages={totalPages}
        siblingCount={siblingCount}
        onChange={setPage}
      />
    </div>
  )
}

export default function ListDemo() {
  return (
    <MemoryRouter initialEntries={['/applications']}>
      <div className="bg-bg min-h-screen">
        <div className="gap-section mx-auto flex max-w-[960px] flex-col p-8">
          <header>
            <h1 className="text-h1">목록 컴포넌트 확인</h1>
            <p className="text-body1 text-text-secondary mt-2">
              S15P21D101-171 · SearchBar / FilterBar / Table / Pagination / useListParams
            </p>
          </header>

          <Section
            title="조립된 목록"
            hint="필터를 바꾸면 위 URL 이 바뀌고 page 가 1로 돌아갑니다. 5페이지에서 필터를 걸어보세요"
          >
            <ConnectedList />
          </Section>

          <Section title="Table — 로딩" hint="헤더는 남고 본문만 스켈레톤. 데이터가 와도 안 튑니다">
            <Table
              caption="로딩 중인 목록"
              columns={columns}
              rows={[]}
              getRowId={(row) => row.id}
              isLoading
              skeletonRows={4}
            />
          </Section>

          <Section title="Table — 0건" hint="empty 를 주지 않으면 기본 문구가 나갑니다">
            <Table caption="빈 목록" columns={columns} rows={[]} getRowId={(row) => row.id} />
          </Section>

          <Section title="Table — 0건 (empty 지정)" hint="화면에 맞는 안내와 다음 행동을 넣습니다">
            <Table
              caption="빈 목록"
              columns={columns}
              rows={[]}
              getRowId={(row) => row.id}
              empty={
                <EmptyState
                  title="아직 신청한 상품이 없어요"
                  description="자격이 되는 자금을 먼저 확인해보세요."
                />
              }
            />
          </Section>

          <Section
            title="Pagination — 축약"
            hint="페이지를 옮겨도 버튼 개수가 일정합니다. 다음 버튼 위치가 흔들리지 않습니다"
          >
            <div className="space-y-3">
              <PaginationPlayground totalPages={3} />
              <PaginationPlayground totalPages={7} />
              <PaginationPlayground totalPages={20} />
              <PaginationPlayground totalPages={20} siblingCount={0} />
            </div>
          </Section>
        </div>
      </div>
    </MemoryRouter>
  )
}