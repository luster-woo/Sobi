import Badge from '@/components/common/Badge'
import Button from '@/components/common/Button'
import Card from '@/components/common/Card'
import { IconChevronRight, IconWon } from '@/components/common/Icon'
import PageTitle from '@/components/common/PageTitle'
import StatCard from '@/components/common/StatCard'
import Tag from '@/components/common/Tag'
import { mockContracts } from '@/mocks/repayments.mock'
import { mockDepositAccounts } from '@/mocks/user.mock'
import { formatManWon, formatMonthDay } from '@/utils/format'

function Row({
  title,
  sub,
  right,
  badges,
}: {
  title: string
  sub: string
  right: string
  badges?: React.ReactNode
}) {
  return (
    <li className="border-border-subtle flex items-center gap-4 border-t px-5 py-3 first:border-t-0">
      <span className="border-border text-text-muted inline-flex size-8 shrink-0 items-center justify-center rounded-full border">
        <IconWon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="typo-body1">{title}</p>
        <p className="typo-caption text-text-muted">{sub}</p>
      </div>
      {badges}
      <span className="typo-h4 font-semibold">{right}</span>
      <IconChevronRight size={14} className="text-text-muted" />
    </li>
  )
}

/** 18-3. 연동 계좌 */
export default function AccountsPage() {
  const depositTotal = mockDepositAccounts.reduce((a, b) => a + b.balance, 0)
  const loanTotal = mockContracts.reduce((a, b) => a + b.balance, 0)

  return (
    <div className="space-y-5">
      <PageTitle
        crumbs={[{ label: '마이페이지', to: '/mypage' }, { label: '연동 계좌' }]}
        title="연동 계좌"
        right={
          <div className="flex items-center gap-4">
            <span className="typo-caption text-text-muted">
              마이데이터로 불러온 계좌예요 · 2026. 9. 2 14:20 갱신
            </span>
            <Button variant="outline" size="sm">
              지금 갱신
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <StatCard labelFirst value={formatManWon(depositTotal)} label="입출금 잔액" />
        <StatCard labelFirst value={formatManWon(loanTotal)} label="대출 잔액" />
        <StatCard labelFirst value="4곳" label="연동 기관" />
      </div>

      <section className="space-y-3">
        <p className="typo-h4">입출금 계좌 {mockDepositAccounts.length}</p>
        <Card className="p-0">
          <ul>
            {mockDepositAccounts.map((a) => (
              <Row
                key={a.id}
                title={`${a.bank} ${a.masked}`}
                sub={a.label}
                right={formatManWon(a.balance)}
                badges={
                  a.isWithdraw ? (
                    <span className="flex items-center gap-1.5">
                      <Badge variant="solid">출금 계좌</Badge>
                      {a.autoTransfer && <Tag>자동이체</Tag>}
                    </span>
                  ) : undefined
                }
              />
            ))}
          </ul>
        </Card>
      </section>

      <section className="space-y-3">
        <p className="typo-h4">대출 계좌 {mockContracts.length}</p>
        <Card className="p-0">
          <ul>
            {mockContracts.map((c) => (
              <Row
                key={c.id}
                title={c.name}
                sub={
                  c.progress.done === 0
                    ? `연 ${c.rate.toFixed(1)}% · 거치 중 · 첫 상환 ${formatMonthDay(c.firstDueDate)}`
                    : `연 ${c.rate.toFixed(1)}% · ${c.progress.total}회 중 ${c.progress.done}회 완료 · 다음 ${formatMonthDay(c.nextDueDate)}`
                }
                right={formatManWon(c.balance)}
              />
            ))}
          </ul>
        </Card>
        <p className="typo-caption text-text-muted">
          계좌를 누르면 최근 거래 내역과 연동 상태를 볼 수 있어요
        </p>
      </section>
    </div>
  )
}
