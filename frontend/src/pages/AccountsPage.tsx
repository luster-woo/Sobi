import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'

import { usePayoutAccounts } from '@/features/application/hooks/usePayoutAccounts'
import { useLoanProducts } from '@/features/loan-repayment/hooks/useRepayment'
import RefreshResultModal from '@/features/mydata/components/RefreshResultModal'
import { useMydataRefresh } from '@/features/mydata/hooks/useMydata'
import { useMyPage } from '@/features/mypage/hooks/useMyPage'
import { ROUTES } from '@/shared/constants/routes'
import { isPreOwner } from '@/shared/types'
import Button from '@/shared/ui/Button'
import EmptyState from '@/shared/ui/EmptyState'
import PageHeading from '@/shared/ui/PageHeading'
import Panel from '@/shared/ui/Panel'
import Skeleton from '@/shared/ui/Skeleton'
import { formatMoneyShort } from '@/shared/utils/formatters'
import { maskAccountNo } from '@/shared/utils/mask'

/**
 * '2026-09-11T14:20:00' → '2026. 9. 11 14:20'
 *
 * 연동은 했는데 판정 시각이 비어 올 수 있다 — 서버가 `linked` 와 `updatedAt` 을
 * 따로 주고 둘이 어긋날 여지가 있다.
 */
function toUpdatedAt(iso: string | null) {
  if (!iso) return '시각 미상'

  const month = Number(iso.slice(5, 7))
  const day = Number(iso.slice(8, 10))
  return `${iso.slice(0, 4)}. ${month}. ${day} ${iso.slice(11, 16)}`
}

function Tile({ term, value, unit }: { term: string; value: string; unit?: string }) {
  return (
    <div className="bg-surface px-3.5 py-3">
      <dt className="text-text-muted text-caption">{term}</dt>
      <dd className="text-text mt-0.5 text-[19px] font-bold tracking-tight tabular-nums">
        {value}
        {unit && <span className="text-text-secondary text-caption font-normal">{unit}</span>}
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
    <div className="border-border-subtle px-card flex items-center gap-4 border-b py-2.5 last:border-b-0">
      <span className="min-w-0 flex-1">
        <b className="text-text text-body2 block truncate font-medium tabular-nums">{title}</b>
        {description && (
          <span className="text-text-muted text-caption mt-px block truncate tabular-nums">
            {description}
          </span>
        )}
      </span>

      <span className="text-text text-body2 shrink-0 text-right font-medium tabular-nums">
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
 * ⚠️ 출처가 셋이다. `GET /user/mypage` 는 **합계만** 주고 계좌 목록은 안 준다
 *    (`payoutAccount` 는 출금 계좌 한 건뿐이다). 그래서 입출금 목록은
 *    `GET /account/list`, 대출 목록은 `POST /repayment/finan/list` 에서 따로 받는다.
 *
 * ⚠️ `GET /account/list` 에는 **잔액이 없다.** 마이페이지가 주는 건 합계뿐이라
 *    계좌별 금액은 지금 채울 방법이 없다 — 줄마다 금액 자리를 비워 둔다.
 *    `usePayoutAccounts` 는 신청 화면과 같이 쓰게 됐으니 shared 로 올릴 때가 됐다
 *    (`features/application/api/accounts.ts` 주석 참고).
 */
export function AccountsPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useMyPage()
  const refresh = useMydataRefresh()

  const owner = !isPreOwner(data?.profile.role ?? null)
  const { data: deposits } = usePayoutAccounts()
  const { data: loans } = useLoanProducts({ enabled: owner })

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
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            다시 시도
          </Button>
        }
      />
    )
  }

  const { myData, accountSummary, payoutAccount } = data
  const depositAccounts = deposits ?? []
  const loanAccounts = loans ?? []

  /*
   * 판정(myData)은 보지 않는다. 계좌가 있으면 판정 전이어도 보여줄 것이 있다.
   *
   * ⚠️ 계좌가 0건인 데는 두 가지 이유가 있다. 아직 연동을 안 했거나, 서버의 금융망
   *    조회가 실패했거나다 — 후자는 `UserServiceImpl.fetchDepositAccounts` 가 예외를
   *    삼키고 빈 리스트를 줘서 응답만으로는 구분되지 않는다. 판정 이력이 있는데
   *    계좌가 0건이면 이미 연동을 마친 사람이므로, 다시 연동하라고 하면 안 된다.
   */
  if (!accountSummary) {
    const linked = myData !== null

    return (
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-3.5">
        <PageHeading title="연동 계좌" />
        <EmptyState
          title={linked ? '계좌 정보를 불러오지 못했어요' : '아직 연동된 계좌가 없어요'}
          description={
            linked
              ? '금융망 조회가 일시적으로 실패했을 수 있어요. 잠시 후 다시 시도해 주세요.'
              : '마이데이터를 연동하면 입출금·대출 계좌를 한곳에서 볼 수 있어요.'
          }
          action={
            linked ? (
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                다시 시도
              </Button>
            ) : (
              <Button onClick={() => void navigate(ROUTES.MYDATA_CONSENT)}>
                마이데이터 연동하기
              </Button>
            )
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-3.5">
      <PageHeading
        title="연동 계좌"
        aside={
          <span className="flex items-center gap-2.5">
            <span className="text-text-muted text-caption tabular-nums">
              마이데이터로 불러온 계좌예요 · {toUpdatedAt(myData?.linkedAt ?? null)} 갱신
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

      <dl className="border-border bg-border grid grid-cols-3 gap-px overflow-hidden rounded-md border">
        <Tile term="입출금 잔액" value={formatMoneyShort(accountSummary.totalBalance)} />
        <Tile term="대출 잔액" value={formatMoneyShort(accountSummary.totalLoanBalance)} />
        <Tile term="연동 기관" value={String(accountSummary.institutionCount)} unit="곳" />
      </dl>

      <section>
        <h3 className="text-text-secondary text-body2 mb-2 font-medium">
          입출금 계좌 {depositAccounts.length}
        </h3>
        <Panel>
          {depositAccounts.length === 0 ? (
            <EmptyState size="sm" title="연동된 입출금 계좌가 없어요" />
          ) : (
            depositAccounts.map((account) => (
              <AccountRow
                key={account.accountId}
                title={`${account.bankName} ${maskAccountNo(account.accountNo)}`}
                /*
                 * 계좌별 잔액이 응답에 없다. 합계는 위 타일이 보여주므로 여기서는
                 * 금액 자리를 비운다 — 0원으로 적으면 잔액이 없는 계좌로 읽힌다.
                 */
                description={
                  payoutAccount?.accountNo === account.accountNo ? '출금 계좌' : undefined
                }
                amount=""
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

      <RefreshResultModal result={refresh.result} onClose={refresh.closeResult} />
    </div>
  )
}
