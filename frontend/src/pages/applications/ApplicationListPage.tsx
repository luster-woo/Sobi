import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Badge from '@/components/common/Badge'
import Button from '@/components/common/Button'
import Card from '@/components/common/Card'
import FilterChip from '@/components/common/FilterChip'
import PageTitle from '@/components/common/PageTitle'
import Stepper from '@/components/common/Stepper'
import { mockApplications } from '@/mocks/applications.mock'
import type { Application, ApplicationStatus } from '@/types'
import { formatDate, formatManWon, formatMonthDay } from '@/utils/format'

function StatusBadge({ s }: { s: ApplicationStatus }) {
  if (s === 'executed') return <Badge variant="solid">실행 완료</Badge>
  if (s === 'paid') return <Badge variant="solid">지급 완료</Badge>
  if (s === 'rejected')
    return (
      <span className="border-border-strong typo-badge text-text-secondary inline-flex h-6 items-center rounded-full border px-3">
        반려
      </span>
    )
  return (
    <Badge variant="dot" tone="neutral">
      심사 중
    </Badge>
  )
}

function statusPath(a: Application) {
  return a.kind === 'loan' ? `/loans/${a.programId}/status` : `/supports/${a.programId}/status`
}

/** 17. 신청 현황 추적 */
export default function ApplicationListPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<'all' | 'progress' | 'done'>('all')
  const inProgress = mockApplications.filter(
    (a) => a.steps.length > 0 && a.steps.some((s) => !s.done),
  )
  const done = mockApplications.filter((a) => !inProgress.includes(a))
  const list = filter === 'all' ? mockApplications : filter === 'progress' ? inProgress : done

  return (
    <div className="space-y-5">
      <PageTitle
        title="신청 현황"
        description={`진행 중 ${inProgress.length}건 · 완료 ${done.length}건`}
        right={
          <div className="flex gap-2">
            <FilterChip active={filter === 'progress'} onClick={() => setFilter('progress')}>
              진행 중 {inProgress.length}
            </FilterChip>
            <FilterChip active={filter === 'done'} onClick={() => setFilter('done')}>
              완료 {done.length}
            </FilterChip>
            <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
              전체 {mockApplications.length}
            </FilterChip>
          </div>
        }
      />

      <div className="space-y-3">
        {list.map((a) => (
          <Card key={a.id} className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="typo-h4">{a.name}</p>
                <p className="typo-caption text-text-muted mt-1">
                  {a.kind === 'loan' ? '대출' : '지원금'} · {formatManWon(a.amount)} 신청 ·{' '}
                  {formatDate(a.appliedAt)} 접수 · 접수번호 {a.receiptNo}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <StatusBadge s={a.status} />
                <Button variant="outline" size="sm" onClick={() => navigate(statusPath(a))}>
                  진행 사항 보기
                </Button>
              </div>
            </div>

            {a.steps.length > 0 && (
              <>
                <Stepper
                  className="px-16"
                  steps={a.steps.map((s) => ({
                    label: s.label,
                    sub: s.date ? `${formatMonthDay(s.date)} 완료` : undefined,
                    done: s.done,
                  }))}
                />
                {a.message && (
                  <div className="bg-surface-muted flex items-center justify-between gap-4 rounded-md px-4 py-2.5">
                    <p className="typo-body2 text-text-secondary">{a.message}</p>
                    <Button variant="outline" size="sm" onClick={() => navigate(statusPath(a))}>
                      상세 보기
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
