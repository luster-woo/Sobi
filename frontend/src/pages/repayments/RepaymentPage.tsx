import { useState } from 'react'
import Card from '@/shared/ui/Card'
import Button from '@/shared/ui/Button'
import Badge from '@/shared/ui/Badge'
import StatCard from '@/shared/ui/StatCard'
import ProgressBar from '@/shared/ui/ProgressBar'
import { IconAlert } from '@/shared/ui/Icon'
import type { LoanContract } from '@/shared/types'
import { mockContracts, mockOverdueContract } from '@/mocks/repayments.mock'
import { cn, formatDate, formatManWon } from '@/shared/lib/format'

const man = (n: number) => `${Math.round(n / 10_000).toLocaleString('ko-KR')}만 원`

function ContractTabs({ items, active, onChange }: { items: LoanContract[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-3">
      {items.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange(c.id)}
          className={cn(
            'h-10 rounded-full border px-5 typo-body2 transition-colors',
            c.id === active ? 'border-primary bg-primary text-white' : 'border-border-strong bg-surface text-text',
          )}
        >
          {c.name} · {c.contractNo}
        </button>
      ))}
    </div>
  )
}

function Stats({ ct }: { ct: LoanContract }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard value={formatManWon(ct.balance)} label="대출 잔액" />
      <StatCard value={man(ct.monthlyPayment)} label="이번 달 상환액" />
      <StatCard value={formatDate(ct.nextDueDate)} label="다음 상환일" />
      <StatCard value={`연 ${ct.rate}%`} label="현재 적용 금리" />
    </div>
  )
}

/** 16. 상환 관리 — 정상 */
function NormalView({ ct }: { ct: LoanContract }) {
  const pct = (ct.progress.done / ct.progress.total) * 100
  return (
    <div className="grid grid-cols-[1fr_300px] gap-6">
      <div className="space-y-4">
        <Card className="space-y-3">
          <div className="flex items-start justify-between">
            <p className="typo-h4">자동 이체 (자동상환)</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">계좌 변경</Button>
              <Button variant="outline" size="sm">해지</Button>
            </div>
          </div>
          <p className="typo-body1">
            {ct.account.bank} {ct.account.masked}·매월 {ct.account.day}일 출금·잔액 부족 시 재출금 {ct.account.retry}회
          </p>
          <p className="typo-caption text-text-muted">대출 가입 시 입력한 출금 계좌가 이체로 등록돼요. 수시 입출금 계좌에서 자동상환됩니다.</p>
        </Card>

        <Card className="p-0">
          <p className="px-5 pt-5 pb-3 typo-h4">자동 이체 기록</p>
          <table className="w-full text-left">
            <thead className="bg-surface-muted typo-caption text-text-muted">
              <tr>
                {['출금일', '상품', '금액', '상태'].map((h) => (
                  <th key={h} className="px-5 py-2.5 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="typo-body2">
              {ct.records.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-6 text-center text-text-muted">아직 출금 기록이 없어요 · 첫 상환일 {formatDate(ct.firstDueDate)}</td></tr>
              )}
              {ct.records.map((r) => (
                <tr key={r.date} className="border-t border-border-subtle">
                  <td className="px-5 py-2.5">{formatDate(r.date)}</td>
                  <td className="px-5 py-2.5">{r.product}</td>
                  <td className="px-5 py-2.5">{man(r.amount)}</td>
                  <td className="px-5 py-2.5">{r.status === 'ok' ? '정상 출금' : '출금 실패'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <p className="typo-h4">전액 상환 (완납)</p>
            <span className="inline-flex h-6 items-center rounded-full border border-border-strong px-3 typo-badge text-text-secondary">중도상환수수료 면제</span>
          </div>
          <p className="typo-caption text-text-muted">일부 금액 조기상환은 지원하지 않아요. 남은 대출을 한 번에 갚을 수 있어요.</p>
          <div className="grid grid-cols-2 gap-4">
            <Card variant="flat" className="space-y-1">
              <p className="typo-caption text-text-muted">지금 완납하면</p>
              <p className="font-heading text-[28px] font-semibold">{formatManWon(ct.balance + 50_000)}</p>
              <p className="typo-caption text-text-muted">원금 {formatManWon(ct.balance).replace(' 원', '')} + 오늘까지 이자 약 5만 원</p>
            </Card>
            <Card variant="flat" className="space-y-1">
              <p className="typo-caption text-text-muted">아끼는 이자</p>
              <p className="font-heading text-[28px] font-semibold">약 145만 원</p>
              <p className="typo-caption text-text-muted">남은 {ct.progress.total - ct.progress.done}회분 이자 150만 원</p>
            </Card>
          </div>
          <Button className="w-full">지금 완납하기</Button>
          <p className="typo-caption text-text-muted">출금 계좌 {ct.account.bank} {ct.account.masked}에서 즉시 출금돼요 · 완납 후 자동이체는 자동 해지됩니다</p>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="space-y-3">
          <p className="typo-h4">총 상환 진행률</p>
          <ProgressBar value={pct} />
          <p className="typo-caption text-text-muted">{ct.progress.total}회 중 {ct.progress.done}회 완료 - 잔여 {ct.progress.total - ct.progress.done}회</p>
        </Card>
        <Card className="space-y-4">
          <p className="typo-h4">지금 금리 인하를 요구해 보세요</p>
          <Badge variant="solid">승인 가능성 높음</Badge>
          <ul className="space-y-1.5 typo-body2">
            <li>✓ 매출 5개월 연속 상승</li>
            <li>✓ 부채비율 개선 (68% — 54%)</li>
            <li>✓ 연체 이력 없음</li>
            <li>✓ 실행 후 6개월 경과</li>
          </ul>
          <div className="flex h-14 items-end gap-2">
            {[40, 55, 45, 60, 75].map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className={cn('w-full rounded-t-sm', i === 4 ? 'bg-border-strong' : 'bg-border')} style={{ height: `${h}%` }} />
                <span className="typo-caption text-text-muted">{4 + i}월</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

/** 16-1. 상환 관리 — 연체 */
function OverdueView({ ct }: { ct: LoanContract }) {
  const od = ct.overdue!
  const pct = (ct.progress.done / ct.progress.total) * 100
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 rounded-lg border border-danger/40 bg-surface px-5 py-4">
        <div className="flex items-center gap-3">
          <IconAlert size={22} className="text-danger" />
          <div>
            <p className="typo-h4">{formatDate(od.date).slice(6)} 상환분이 연체됐어요. 연체 이자가 발생하고 있어요.</p>
            <p className="typo-caption text-text-muted">연체 {od.days}일 · 연체 이자 연 6.4% 적용 중 · 신용점수에 영향을 줄 수 있어요</p>
          </div>
        </div>
        <Button>지금 상환하기</Button>
      </div>

      <Stats ct={ct} />

      <div className="grid grid-cols-[1fr_300px] gap-6">
        <div className="space-y-4">
          <Card className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="typo-h4">자동 이체 (자동상환)</p>
              <span className="inline-flex h-6 items-center rounded-full border border-danger px-3 typo-badge text-danger">출금 실패</span>
            </div>
            <p className="typo-body1">{ct.account.bank} {ct.account.masked}·{formatDate(od.date).slice(6)} 출금 실패 (잔액 부족)·재출금 2회 남음</p>
            <p className="typo-caption text-text-muted">다음 재출금 {formatDate(od.nextRetry)} · 재출금일 전까지 출금 계좌에 잔액을 채우면 정상 처리돼요.</p>
          </Card>

          <Card className="p-0">
            <p className="px-5 pt-5 pb-3 typo-h4">연체 내역</p>
            <table className="w-full text-left">
              <thead className="bg-surface-muted typo-caption text-text-muted">
                <tr>{['출금일', '금액', '연체 일수', '연체 이자'].map((h) => <th key={h} className="px-5 py-2.5 font-normal">{h}</th>)}</tr>
              </thead>
              <tbody className="typo-body2">
                <tr className="border-t border-border-subtle">
                  <td className="px-5 py-3">{formatDate(od.date)}</td>
                  <td className="px-5 py-3">{man(od.amount)}</td>
                  <td className="px-5 py-3">{od.days}일</td>
                  <td className="px-5 py-3">{od.interest.toLocaleString()}원</td>
                </tr>
              </tbody>
            </table>
          </Card>

          <Card className="space-y-4">
            <p className="typo-h4">지금 할 수 있는 것</p>
            {[
              ['바로 상환하기', `연체 원금 ${man(od.amount)} + 연체 이자 ${od.interest}원`],
              ['출금 계좌에 잔액 채우기', `재출금일(${formatDate(od.nextRetry).slice(6)}) 전에 입금해 두면 자동으로 정상 처리돼요`],
              ['기관에 상환 유예 문의', '소상공인시장진흥공단 1357'],
            ].map(([t, d], i) => (
              <div key={t} className={cn(i > 0 && 'border-t border-border-subtle pt-3')}>
                <p className="typo-body1">·{t}</p>
                <p className="pl-2 typo-caption text-text-muted">{d}</p>
              </div>
            ))}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="space-y-3">
            <p className="typo-h4">상환 진행률</p>
            <ProgressBar value={pct} />
            <p className="typo-caption text-text-muted">{ct.progress.total}회 중 {ct.progress.done}회 완료·{ct.progress.overdue}회 연체·잔여 {ct.progress.total - ct.progress.done - ct.progress.overdue}회</p>
          </Card>
          <Card className="space-y-3">
            <p className="typo-h4">금리 인하 요구</p>
            <span className="inline-flex h-6 items-center rounded-full border border-dashed border-border-strong px-3 typo-badge text-text-disabled">연체 해소 후 이용 가능</span>
            <p className="typo-caption text-text-muted">연체 이력이 있으면 요구 요건을 충족하지 못해요. 상환을 완료하면 다시 확인해 드릴게요.</p>
          </Card>
          <Card className="space-y-2">
            <p className="typo-h4">연체가 계속되면</p>
            <ul className="space-y-1 typo-caption text-text-muted">
              <li>· 연체 이자가 매일 쌓여요</li>
              <li>·신용점수가 떨어질 수 있어요</li>
              <li>·금리 인하 요구 자격을 잃어요</li>
              <li>· 추가 정책자금 신청이 제한돼요</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function RepaymentPage() {
  const [active, setActive] = useState(mockContracts[1].id)
  const [overdue, setOverdue] = useState(false)
  const base = mockContracts.find((c) => c.id === active)!
  const ct = overdue && active === mockOverdueContract.id ? mockOverdueContract : base

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <ContractTabs items={mockContracts} active={active} onChange={setActive} />
        {active === mockOverdueContract.id && (
          <button type="button" onClick={() => setOverdue((v) => !v)} className="typo-caption text-text-muted underline-offset-2 hover:underline">
            목업: {overdue ? '정상 상태 보기' : '연체 상태 보기 (16-1)'}
          </button>
        )}
      </div>
      {ct.overdue ? (
        <OverdueView ct={ct} />
      ) : (
        <>
          <Stats ct={ct} />
          <NormalView ct={ct} />
        </>
      )}
    </div>
  )
}
