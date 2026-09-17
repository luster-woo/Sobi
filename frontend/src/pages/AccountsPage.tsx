import type { ReactNode } from 'react'

import { useLoanProducts } from '@/features/loan-repayment/hooks/useRepayment'
import { useMydataRefresh } from '@/features/mydata/hooks/useMydata'
import Breadcrumb from '@/features/mypage/components/Breadcrumb'
import { useMyPage } from '@/features/mypage/hooks/useMyPage'
import { ROUTES } from '@/shared/constants/routes'
import { isPreOwner } from '@/shared/types'
import Button from '@/shared/ui/Button'
import EmptyState from '@/shared/ui/EmptyState'
import Panel from '@/shared/ui/Panel'
import Skeleton from '@/shared/ui/Skeleton'
import { formatMoneyShort } from '@/shared/utils/formatters'
import { maskAccountNo } from '@/shared/utils/mask'

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
 * 화살표를 두지 않는다. 거래 내역 API 가 설계되지 않아 눌러도 갈 곳이 없는데,
 * 화살표만 있으면 누를 수 있는 것처럼 보인다.
 */
function AccountRow({
  title,
  description,
  amount,
}: {
  title: string
  description?: ReactNode
  amount: string
}) {
  return (
    <div className="border-border-subtle flex items-center gap-4 border-b px-[15px] py-2.5 last:border-b-0">
      <span className="min-w-0 flex-1">
        <b className="text-text text-body2 block truncate font-medium tabular-nums">{title}</b>
        {description && (
          <span className="text-text-muted mt-px block truncate text-[11px] tabular-nums">
            {description}
          </span>
        )}
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
 * ⚠️ 두 목록의 출처가 다르다. 입출금은 `GET /user/mypage` 의 `withdrawAccount`, 대출은
 *    `POST /repayment/finan/list` 다. 마이데이터 응답에 대출 계좌 목록이 없고 합계만
 *    있어서, 개별 대출은 상환 쪽에서 가져온다.
 */
export function AccountsPage() {
  const { data, isLoading, isError } = useMyPage()
  const refresh = useMydataRefresh()

  const { data: loans } = useLoanProducts({
    enabled: !isPreOwner(data?.profile.role ?? null),
  })

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-3.5">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-[86px] w-full" />
        <Skeleton className="h-[160px] w-full" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <EmptyState
        title="계좌 정보를 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요."
        action={
          <Button variant="outline" onClick={() => window.location.reload()}>
            다시 불러오기
          </Button>
        }
      />
    )
  }

  const { myData, accountSummary, deposits } = data
  const loanAccounts = loans ?? []

  if (!accountSummary || !myData) {
    return (
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-3.5">
        <Breadcrumb parentLabel="마이페이지" parentTo={ROUTES.MYPAGE} current="연동 계좌" />
        <EmptyState
          title="아직 연동된 계좌가 없어요"
          description="마이데이터를 연동하면 입출금·대출 계좌를 한곳에서 볼 수 있어요."
          action={
            <Button onClick={() => window.location.assign(ROUTES.MYDATA_CONSENT)}>
              마이데이터 연동하기
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-3.5">
      <Breadcrumb
        parentLabel="마이페이지"
        parentTo={ROUTES.MYPAGE}
        current="연동 계좌"
        aside={
          <span className="flex items-center gap-2.5">
            <span className="text-text-muted text-[11.5px] tabular-nums">
              마이데이터로 불러온 계좌예요 · {toUpdatedAt(myData.linkedAt)} 갱신
              {/* 서버 쿨다운이 남아 있으면 눌러도 429 라 미리 잠근다 */}
              {refresh.remaining && ` · ${refresh.remaining} 갱신 가능`}
            </span>
            <Button
              variant="outline"
              size="sm"
              loading={refresh.isPending}
              disabled={refresh.remaining !== null}
              onClick={refresh.refresh}
            >
              지금 갱신
            </Button>
          </span>
        }
      />

      {/*
       * 세 번째 타일이 '연동 기관' 이 아니라 '연결 계좌' 다. 응답의 `accountNum` 은
       * 계좌 수이고 기관 수는 오지 않는다 — 한 은행에 계좌가 둘일 수 있어서 둘은 다르다.
       */}
      <dl className="border-border bg-border grid grid-cols-3 gap-px overflow-hidden rounded-md border">
        <Tile term="입출금 잔액" value={formatMoneyShort(accountSummary.totalBalance)} />
        <Tile term="대출 잔액" value={formatMoneyShort(accountSummary.totalLoanBalance)} />
        <Tile term="연결 계좌" value={String(accountSummary.accountCount)} unit="개" />
      </dl>

      <section>
        <h3 className="text-text-secondary text-body2 mb-2 font-medium">
          입출금 계좌 {deposits.length}
        </h3>
        <Panel>
          {deposits.length === 0 ? (
            <EmptyState size="sm" title="연동된 입출금 계좌가 없어요" />
          ) : (
            deposits.map((account) => (
              <AccountRow
                key={account.accountNo}
                title={`${account.bankName} ${maskAccountNo(account.accountNo)}`}
                amount={formatMoneyShort(account.balance)}
              />
            ))
          )}
        </Panel>
      </section>

      <section>
        <h3 className="text-text-secondary text-body2 mb-2 font-medium">
          대출 계좌 {loanAccounts.length}
        </h3>
        <Panel>
          {loanAccounts.length === 0 ? (
            <EmptyState size="sm" title="상환 중인 대출이 없어요" />
          ) : (
            loanAccounts.map((loan) => (
              <AccountRow
                key={loan.accountNo}
                title={loan.accountName}
                description={`${loan.bankName} · 연 ${loan.interestRate.toFixed(1)}%`}
                amount={formatMoneyShort(loan.loanBalance)}
              />
            ))
          )}
        </Panel>
      </section>
    </div>
  )
}
