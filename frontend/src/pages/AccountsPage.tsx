import type { ReactNode } from 'react'

import Breadcrumb from '@/features/mypage/components/Breadcrumb'
import { MOCK_LINKED_ACCOUNTS } from '@/features/mypage/model/mock'
import { ROUTES } from '@/shared/constants/routes'
import Badge from '@/shared/ui/Badge'
import Button from '@/shared/ui/Button'
import Panel from '@/shared/ui/Panel'
import { formatMoneyShort } from '@/shared/utils/formatters'

/** '2026-09-11T14:20:00' → '2026. 9. 11 14:20' */
function toUpdatedAt(iso: string) {
  const month = Number(iso.slice(5, 7))
  const day = Number(iso.slice(8, 10))
  return `${iso.slice(0, 4)}. ${month}. ${day} ${iso.slice(11, 16)}`
}

function Tile({ term, value, unit }: { term: string; value: string; unit?: string }) {
  return (
    <div className="bg-surface px-3.5 py-3">
      <dt className="text-text-muted text-[11px]">{term}</dt>
      <dd className="text-text mt-0.5 text-[19px] font-bold tracking-tight tabular-nums">
        {value}
        {unit && <span className="text-text-secondary text-[11.5px] font-normal">{unit}</span>}
      </dd>
    </div>
  )
}

/**
 * 계좌 한 줄.
 *
 * 시안의 ₩ 동그라미를 뺐다. 모든 줄에 같은 글자가 붙어 있어 구분에 쓸모가 없고,
 * 아이콘·이름·배지·금액이 한 줄에 늘어서면 가운데가 크게 빈다.
 *
 * 배지를 계좌 이름 옆에 붙인다. '출금 계좌' 는 그 계좌의 성격이지 금액에 관한 말이
 * 아니라, 금액 쪽으로 밀어두면 어느 쪽을 수식하는지 흐려진다.
 *
 * 화살표를 두지 않는다. 거래 내역 API 가 설계되지 않아 눌러도 갈 곳이 없는데,
 * 화살표만 있으면 누를 수 있는 것처럼 보인다.
 */
function AccountRow({
  title,
  description,
  tags,
  amount,
}: {
  title: string
  description: string
  tags?: ReactNode
  amount: string
}) {
  return (
    <div className="border-border-subtle flex items-center gap-4 border-b px-[15px] py-2.5 last:border-b-0">
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <b className="text-text text-body2 truncate font-medium tabular-nums">{title}</b>
          {tags}
        </span>
        <span className="text-text-muted mt-px block truncate text-[11px] tabular-nums">
          {description}
        </span>
      </span>

      <span className="text-text shrink-0 text-right text-[13.5px] font-medium tabular-nums">
        {amount}
      </span>
    </div>
  )
}

/**
 * 연동 계좌 (시안 18-3).
 *
 * 입출금과 대출을 나눠 쌓는다. 둘은 같은 '계좌' 지만 읽는 방향이 반대다 — 입출금은
 * 얼마가 있는지, 대출은 얼마가 남았는지다. 한 목록에 섞으면 합계가 무슨 뜻인지
 * 알 수 없다.
 *
 * ⚠️ 값은 목이다. 백엔드에 `AccountController` 와 `AccountResponse.accountList` 가
 *    이미 있으니 붙일 때 그 모양을 먼저 확인할 것.
 */
export function AccountsPage() {
  const { updatedAt, totalBalance, totalLoanBalance, institutionCount, deposits, loans } =
    MOCK_LINKED_ACCOUNTS

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-3.5">
      <Breadcrumb
        parentLabel="마이페이지"
        parentTo={ROUTES.MYPAGE}
        current="연동 계좌"
        aside={
          <span className="flex items-center gap-2.5">
            <span className="text-text-muted text-[11.5px] tabular-nums">
              마이데이터로 불러온 계좌예요 · {toUpdatedAt(updatedAt)} 갱신
            </span>
            {/* TODO: POST /mydata/refresh — 비동기라 진행률 표시가 필요하다 */}
            <Button variant="outline" size="sm">
              지금 갱신
            </Button>
          </span>
        }
      />

      <dl className="border-border bg-border grid grid-cols-3 gap-px overflow-hidden rounded-md border">
        <Tile term="입출금 잔액" value={formatMoneyShort(totalBalance)} />
        <Tile term="대출 잔액" value={formatMoneyShort(totalLoanBalance)} />
        <Tile term="연동 기관" value={String(institutionCount)} unit="곳" />
      </dl>

      <section>
        <h3 className="text-text-secondary text-body2 mb-2 font-medium">
          입출금 계좌 {deposits.length}
        </h3>
        <Panel>
          {deposits.map((account) => (
            <AccountRow
              key={account.accountId}
              title={`${account.bankName} ${account.maskedNumber}`}
              description={account.description}
              amount={formatMoneyShort(account.balance)}
              tags={
                account.isPayout ? (
                  // 출금 계좌면 자동이체도 그 계좌에서 빠진다. 배지 둘은 같은 말이라
                  // 하나로 합쳤다
                  <Badge variant="success">
                    {account.autoTransfer ? '출금 · 자동이체' : '출금 계좌'}
                  </Badge>
                ) : undefined
              }
            />
          ))}
        </Panel>
      </section>

      <section>
        <h3 className="text-text-secondary text-body2 mb-2 font-medium">
          대출 계좌 {loans.length}
        </h3>
        <Panel>
          {loans.map((loan) => (
            <AccountRow
              key={loan.accountId}
              title={loan.name}
              description={`연 ${loan.interestRate.toFixed(1)}% · ${loan.description}`}
              amount={formatMoneyShort(loan.balance)}
            />
          ))}
        </Panel>
      </section>
    </div>
  )
}
