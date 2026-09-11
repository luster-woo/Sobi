import { useState } from 'react'

import LoanDetailModal from '@/features/loan/components/LoanDetailModal'
import Breadcrumb from '@/features/mypage/components/Breadcrumb'
import { MOCK_FAVORITES } from '@/features/mypage/model/mock'
import { FAVORITE_KIND, type FavoriteKind } from '@/features/mypage/model/types'
import SupportProgramDetailModal from '@/features/support-program/components/SupportProgramDetailModal'
import { LOAN_STATUS_LABEL, SUPPORT_STATUS_LABEL } from '@/shared/constants/productStatus'
import { ROUTES } from '@/shared/constants/routes'
import BookmarkIcon from '@/shared/ui/BookmarkIcon'
import EmptyState from '@/shared/ui/EmptyState'
import Panel from '@/shared/ui/Panel'
import ProductStatusBadge from '@/shared/ui/ProductStatusBadge'
import { cn } from '@/shared/utils/cn'
import { formatDeadlineDate, formatMoneyShort } from '@/shared/utils/formatters'

type Filter = 'ALL' | FavoriteKind

const KIND_LABEL: Record<FavoriteKind, string> = {
  LOAN: '대출',
  SUPPORT_PROGRAM: '지원사업',
}

const TABS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: FAVORITE_KIND.LOAN, label: '대출' },
  { value: FAVORITE_KIND.SUPPORT_PROGRAM, label: '지원사업' },
]

/**
 * 유형이 정하는 값의 이름. 항목이 들고 있으면 같은 대출인데 줄마다 다른 말이 될 수 있다.
 */
const VALUE_LABEL: Record<FavoriteKind, string> = {
  LOAN: '금리',
  SUPPORT_PROGRAM: '지원 금액',
}

/** 대출은 연 이율, 지원사업은 한도. 단위까지 유형이 정한다 */
function toValueText(kind: FavoriteKind, amount: number) {
  return kind === FAVORITE_KIND.LOAN
    ? `연 ${amount.toFixed(1)}%`
    : `최대 ${formatMoneyShort(amount)}`
}

/**
 * 관심 목록 (시안 18-1).
 *
 * 대출과 지원사업을 한 표에 섞는다. 사용자에게는 '저장해둔 것' 하나라 둘로 나누면
 * 찾을 때마다 두 군데를 봐야 한다. 대신 위 칩으로 걸러낸다.
 *
 * 카드가 아니라 행으로 그리는 이유: 여기 오는 사람은 훑어보러 온 것이 아니라 저장해둔
 * 것 중 하나를 고르러 온다. 한 줄에 하나씩 놓아야 이름과 마감일을 세로로 비교한다.
 *
 * ⚠️ 값은 목이다. `GET /bookmark/me` 가 붙으면 useQuery 로 바꾸고, 해제는
 *    `DELETE /bookmark/{programId}?type=` 을 부른다.
 */
export function FavoritesPage() {
  const [filter, setFilter] = useState<Filter>('ALL')
  // ⚠️ 해제를 화면 안에서만 기억한다. 새로고침하면 돌아온다
  const [removed, setRemoved] = useState<Set<number>>(new Set())

  const items = MOCK_FAVORITES.filter((item) => !removed.has(item.id))
  const shown = filter === 'ALL' ? items : items.filter((item) => item.kind === filter)

  const countOf = (kind: FavoriteKind) => items.filter((item) => item.kind === kind).length

  /*
   * 상세를 이 자리에 띄운다. 대출 목록으로 옮겨가면 닫았을 때 관심 목록이 아니라
   * 그 목록에 서 있게 된다 — 저장해둔 것을 하나씩 확인하는 흐름이 끊긴다.
   * 대시보드 카드와 같은 방식이다.
   */
  const [openItem, setOpenItem] = useState<{ kind: FavoriteKind; id: number } | null>(null)

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-3.5">
      <Breadcrumb parentLabel="마이페이지" parentTo={ROUTES.MYPAGE} current="관심 목록" />

      {/*
       * shared 의 FilterChip 을 쓰지 않는다. 그쪽은 켜고 끄는 토글이라 선택되면 X 가
       * 붙는데, 여기 셋은 하나만 고르는 탭이다. X 를 누르면 아무것도 안 선택된 상태가
       * 되어 버린다.
       */}
      <div role="tablist" aria-label="유형" className="flex flex-wrap items-center gap-2">
        {TABS.map((tab) => {
          const selected = filter === tab.value
          const count = tab.value === 'ALL' ? items.length : countOf(tab.value)

          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setFilter(tab.value)}
              className={cn(
                'text-body2 inline-flex h-[30px] shrink-0 items-center rounded-sm border px-3 transition-colors',
                selected
                  ? 'border-primary bg-primary-soft text-primary font-medium'
                  : 'border-border bg-surface text-text-secondary hover:border-border-strong',
              )}
            >
              {tab.label} {count}
            </button>
          )
        })}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title="저장해둔 상품이 없어요"
          description="대출·지원사업 목록에서 북마크를 누르면 여기 모입니다."
        />
      ) : (
        <Panel>
          {shown.map((item) => {
            const impossible = item.status === 'IMPOSSIBLE'

            return (
              <div
                key={`${item.kind}-${item.id}`}
                /*
                 * 열 너비를 style 로 준다. `grid-cols-[...]` 임의값은 Tailwind 가 이
                 * 조합을 클래스로 뽑아내지 못해 한 칸짜리 그리드가 됐다(실측).
                 */
                style={{ gridTemplateColumns: 'minmax(0,1fr) 108px 84px 84px 40px' }}
                className={cn(
                  'border-border-subtle grid items-center gap-3 border-b px-[15px] py-2.5 last:border-b-0',
                  // 자격이 안 되는 줄은 눌러도 신청할 수 없다. 흐리게 두어 먼저 걸러 보게 한다
                  impossible && 'bg-surface-muted',
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenItem({ kind: item.kind, id: item.id })}
                  className="focus-visible:outline-primary min-w-0 text-left focus-visible:outline focus-visible:outline-offset-2"
                >
                  <b
                    className={cn(
                      'text-body2 block truncate font-medium',
                      impossible ? 'text-text-muted' : 'text-text',
                    )}
                  >
                    {item.title}
                  </b>
                  <span className="text-text-muted block truncate text-[11px]">
                    {KIND_LABEL[item.kind]} · {item.organization}
                    {item.tag && ` · ${item.tag}`}
                  </span>
                </button>

                <span className="text-right text-[12.5px] tabular-nums">
                  <i className="text-text-muted block text-[10px] tracking-wide not-italic">
                    {VALUE_LABEL[item.kind]}
                  </i>
                  <span className={impossible ? 'text-text-muted' : 'text-text'}>
                    {toValueText(item.kind, item.amount)}
                  </span>
                </span>

                {/* 마감일에 색을 넣지 않는다. 저장해둔 것을 훑는 자리라 급한 것을
                    골라주기보다 네 줄이 같은 무게로 읽히는 편이 낫다.
                    문구는 지원사업 목록과 같다 (shared 의 formatDeadlineDate) */}
                <span
                  className={cn(
                    'text-right text-[12.5px] tabular-nums',
                    impossible ? 'text-text-muted' : 'text-text-secondary',
                  )}
                >
                  {formatDeadlineDate(item.endDate)}
                </span>

                {/*
                 * 배지 폭이 문구 길이만큼 제각각이라('불가' 대 '신청 완료') 가운데
                 * 정렬하면 줄마다 좌우로 흔들린다. 칸을 고정하고 배지를 늘려 맞춘다.
                 */}
                <ProductStatusBadge
                  status={item.status}
                  labels={
                    item.kind === FAVORITE_KIND.LOAN ? LOAN_STATUS_LABEL : SUPPORT_STATUS_LABEL
                  }
                  className="w-full justify-center"
                />

                <span className="flex justify-center">
                  <button
                    type="button"
                    aria-label={`${item.title} 관심 목록에서 제거`}
                    onClick={() => setRemoved((previous) => new Set(previous).add(item.id))}
                    className="text-text hover:text-text-muted focus-visible:outline-primary rounded p-1 transition-colors focus-visible:outline focus-visible:outline-offset-1"
                  >
                    {/* 저장돼 있는 것만 모인 자리라 항상 채워진 리본이다 */}
                    <BookmarkIcon filled />
                  </button>
                </span>
              </div>
            )
          })}
        </Panel>
      )}

      {/* 목록 화면과 같은 상세 모달이다. 주소는 바꾸지 않는다 */}
      {openItem?.kind === FAVORITE_KIND.LOAN && (
        <LoanDetailModal loanId={openItem.id} onClose={() => setOpenItem(null)} />
      )}

      {openItem?.kind === FAVORITE_KIND.SUPPORT_PROGRAM && (
        <SupportProgramDetailModal
          supportProgramId={openItem.id}
          onClose={() => setOpenItem(null)}
        />
      )}
    </div>
  )
}
