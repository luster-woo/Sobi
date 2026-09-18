import { useState } from 'react'

import LoanDetailModal from '@/features/loan/components/LoanDetailModal'
import Breadcrumb from '@/features/mypage/components/Breadcrumb'
import { useBookmarks, useRemoveFavorite } from '@/features/mypage/hooks/useBookmarks'
import { FAVORITE_KIND, type FavoriteItem, type FavoriteKind } from '@/features/mypage/model/types'
import SupportProgramDetailModal from '@/features/support-program/components/SupportProgramDetailModal'
import { LOAN_STATUS_LABEL, SUPPORT_STATUS_LABEL } from '@/shared/constants/productStatus'
import { ROUTES } from '@/shared/constants/routes'
import BookmarkIcon from '@/shared/ui/BookmarkIcon'
import EmptyState from '@/shared/ui/EmptyState'
import Panel from '@/shared/ui/Panel'
import ProductStatusBadge from '@/shared/ui/ProductStatusBadge'
import Skeleton from '@/shared/ui/Skeleton'
import { cn } from '@/shared/utils/cn'
import { formatDeadlineDate, formatMoneyShort } from '@/shared/utils/formatters'

type Filter = 'ALL' | FavoriteKind

const KIND_LABEL: Record<FavoriteKind, string> = {
  LOAN: '대출',
  SUPPORT: '지원사업',
}

const TABS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: FAVORITE_KIND.LOAN, label: '대출' },
  { value: FAVORITE_KIND.SUPPORT, label: '지원사업' },
]

/** 값 칸 하나. 위에 작은 라벨, 아래 값 */
interface Cell {
  label: string
  text: string
}

/**
 * 가운데 두 칸에 무엇을 넣을지 유형이 정한다.
 *
 * 대출은 금리·한도, 지원사업은 지원 금액·마감일이다. 각자의 목록 화면
 * (loanColumns · supportColumns)이 보여주는 것과 같은 값을 같은 문구로 쓴다 —
 * 같은 상품이 화면을 옮길 때마다 다른 값으로 읽히면 저장해둔 것과 같은 것인지
 * 확인해야 한다.
 *
 * 두 유형이 다른 값을 쓰므로 라벨을 값 위에 붙인다. 열 머리글 하나로는 한쪽이
 * 반드시 틀린 말이 된다 ('금리' 열에 지원 금액이 들어가는 식).
 *
 * ⚠️ 대출에는 마감일이 없다. `loan` 테이블에 end_date 컬럼 자체가 없는 상시 접수
 *    상품이라 서버가 줄 것이 없어서, 그 자리에 한도를 놓았다.
 */
function toCells(item: FavoriteItem): [Cell, Cell] {
  if (item.kind === FAVORITE_KIND.LOAN) {
    return [
      // 소수점 한 자리로 맞춘다. 3 과 3.5 가 섞이면 자릿수가 흔들린다
      { label: '금리', text: `연 ${item.interestRate.toFixed(1)}%` },
      { label: '한도', text: `최대 ${formatMoneyShort(item.maxLoanBalance)}` },
    ]
  }

  return [
    // 공고에 금액이 안 적힌 건이 실제로 있다. 그때는 '최대 -' 대신 '-' 하나만 둔다
    {
      label: '지원 금액',
      text: item.maxBalance === null ? '-' : `최대 ${formatMoneyShort(item.maxBalance)}`,
    },
    { label: '마감', text: formatDeadlineDate(item.endDate) },
  ]
}

/**
 * 이름 아래 한 줄. 유형과 기관은 공통이고 뒤에 붙는 것이 갈린다.
 *
 * 대출은 기간(360일), 지원사업은 융자형일 때만 이율. 둘 다 값 칸에 넣기엔 덜
 * 중요하지만 없으면 상품을 구분하기 어려운 것들이다.
 */
function toSubtitle(item: FavoriteItem): string {
  const parts = [KIND_LABEL[item.kind], item.organization]

  if (item.kind === FAVORITE_KIND.LOAN) {
    // ⚠️ 개월이 아니라 일이다. 대출 상세 모달과 같은 단위를 쓴다
    parts.push(`${item.period}일`)
  } else if (item.interestRate !== null) {
    // 보조금·바우처에는 이율이 없다. null 이면 통째로 뺀다
    parts.push(`연 ${item.interestRate.toFixed(1)}%`)
  }

  return parts.join(' · ')
}

/** 이름 / 값 / 값 / 상태 / 해제. 로딩 자리도 같은 폭을 써야 레이아웃이 안 튄다 */
const GRID_TEMPLATE = 'minmax(0,1fr) 112px 112px 84px 40px'

/** 목록이 오기 전 자리를 잡아둔다. 저장 개수를 모르니 적당히 넷 */
const SKELETON_ROWS = 4

/**
 * 관심 목록 (시안 18-1).
 *
 * 대출과 지원사업을 한 표에 섞는다. 사용자에게는 '저장해둔 것' 하나라 둘로 나누면
 * 찾을 때마다 두 군데를 봐야 한다. 대신 위 칩으로 걸러낸다.
 *
 * 카드가 아니라 행으로 그리는 이유: 여기 오는 사람은 훑어보러 온 것이 아니라 저장해둔
 * 것 중 하나를 고르러 온다. 한 줄에 하나씩 놓아야 이름과 값을 세로로 비교한다.
 *
 * 값은 `GET /bookmark/me` 에서 온다 (368). 빼기는 `DELETE /bookmark/{programId}` 다 (367).
 */
export function FavoritesPage() {
  const [filter, setFilter] = useState<Filter>('ALL')

  const { data, isLoading, isError } = useBookmarks()

  /*
   * 낙관적으로 지운다 — 누른 줄이 곧바로 사라진다. 실패하면 되돌아오고 토스트가 뜬다.
   * 자세한 건 `useRemoveFavorite` 주석에.
   */
  const removeFavorite = useRemoveFavorite()

  /*
   * 키에 유형을 섞는다. programId 가 대출 id 와 지원사업 id 를 겸해서 21번 대출을
   * 빼면 21번 지원사업까지 같이 사라진다.
   */
  const keyOf = (item: FavoriteItem) => `${item.kind}-${item.id}`

  const items = data ?? []
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
              {/* 개수는 조회가 끝난 뒤에만 붙인다. 로딩 중 0 을 보여주면 비어 있는 것으로 읽힌다 */}
              {tab.label}
              {!isLoading && !isError && ` ${count}`}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <Panel>
          {/* 값이 올 자리를 같은 그리드로 잡아둔다. 안 그러면 로딩이 끝날 때 줄이 튄다 */}
          <div role="status" aria-label="관심 목록을 불러오는 중">
            {Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <div
                key={index}
                style={{ gridTemplateColumns: GRID_TEMPLATE }}
                className="border-border-subtle grid items-center gap-3 border-b px-[15px] py-2.5 last:border-b-0"
              >
                <Skeleton variant="text" width="58%" height={16} />
                <Skeleton variant="text" height={16} />
                <Skeleton variant="text" height={16} />
                <Skeleton variant="text" height={20} />
                <Skeleton variant="text" height={16} />
              </div>
            ))}
          </div>
        </Panel>
      ) : isError ? (
        <Panel>
          <EmptyState
            title="관심 목록을 불러오지 못했어요"
            description="잠시 후 다시 시도해주세요."
          />
        </Panel>
      ) : shown.length === 0 ? (
        <EmptyState
          title={
            // 유형 탭을 좁혀서 빈 것과 아예 아무것도 저장 안 한 것은 다른 상황이다
            items.length === 0
              ? '저장해둔 상품이 없어요'
              : `저장해둔 ${KIND_LABEL[filter as FavoriteKind]}이 없어요`
          }
          description={
            items.length === 0
              ? '대출·지원사업 목록에서 북마크를 누르면 여기 모입니다.'
              : '위 탭에서 전체를 눌러 다른 유형도 확인해보세요.'
          }
        />
      ) : (
        <Panel>
          {shown.map((item) => {
            const impossible = item.status === 'INELIGIBLE'
            const [primary, secondary] = toCells(item)

            return (
              <div
                key={keyOf(item)}
                /*
                 * 열 너비를 style 로 준다. `grid-cols-[...]` 임의값은 Tailwind 가 이
                 * 조합을 클래스로 뽑아내지 못해 한 칸짜리 그리드가 됐다(실측).
                 */
                style={{ gridTemplateColumns: GRID_TEMPLATE }}
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
                    {toSubtitle(item)}
                  </span>
                </button>

                {/*
                 * 두 칸이 같은 모양이다. 유형마다 들어가는 값만 다르고 정렬·자릿수는
                 * 같아야 세로로 비교된다 (12.5px · tabular-nums · 오른쪽 정렬)
                 */}
                {[primary, secondary].map((cell) => (
                  <span key={cell.label} className="text-right text-[12.5px] tabular-nums">
                    <i className="text-text-muted block text-[10px] tracking-wide not-italic">
                      {cell.label}
                    </i>
                    <span className={impossible ? 'text-text-muted' : 'text-text'}>
                      {cell.text}
                    </span>
                  </span>
                ))}

                {/*
                 * 배지 폭이 문구 길이만큼 제각각이라('불가' 대 '신청 완료') 가운데
                 * 정렬하면 줄마다 좌우로 흔들린다. 칸을 고정하고 배지를 늘려 맞춘다.
                 */}
                <ProductStatusBadge
                  status={item.status}
                  /*
                   * 대출 항목에도 지원사업 라벨 표를 바탕으로 넘긴다. 값 집합이 넓은
                   * 쪽이라 대출 값이 전부 들어 있고, UNKNOWN 만 대출에 안 올 뿐이다.
                   * 문구가 갈리는 APPROVED·PAID 는 대출 표가 덮어쓴다.
                   */
                  labels={
                    item.kind === FAVORITE_KIND.LOAN
                      ? { ...SUPPORT_STATUS_LABEL, ...LOAN_STATUS_LABEL }
                      : SUPPORT_STATUS_LABEL
                  }
                  className="w-full justify-center"
                />

                <span className="flex justify-center">
                  <button
                    type="button"
                    aria-label={`${item.title} 관심 목록에서 제거`}
                    onClick={() => removeFavorite.mutate({ programId: item.id, type: item.kind })}
                    /*
                     * 연타를 막지 않는다. 낙관적 갱신으로 줄이 이미 사라져서 같은 줄을
                     * 두 번 누를 수가 없고, 다른 줄은 각자 독립이라 막을 이유가 없다.
                     */
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

      {openItem?.kind === FAVORITE_KIND.SUPPORT && (
        <SupportProgramDetailModal
          supportProgramId={openItem.id}
          onClose={() => setOpenItem(null)}
        />
      )}
    </div>
  )
}
