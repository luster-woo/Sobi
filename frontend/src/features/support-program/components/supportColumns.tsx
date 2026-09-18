import { maxBalanceText } from '@/features/support-program/model/amount'
import type { SupportProgramListItem } from '@/features/support-program/model/types'
import { SUPPORT_PROGRAM_TYPE_LABEL } from '@/features/support-program/model/types'
import { SUPPORT_STATUS, SUPPORT_STATUS_LABEL } from '@/shared/constants/productStatus'
import { BOOKMARK_TARGET } from '@/shared/types'
import BookmarkToggle from '@/shared/ui/BookmarkToggle'
import ProductStatusBadge from '@/shared/ui/ProductStatusBadge'
import type { Column } from '@/shared/ui/Table'
import { cn } from '@/shared/utils/cn'
import { formatDeadlineDate } from '@/shared/utils/formatters'

/**
 * 지원 내용 한 칸에 type 별로 다른 내용을 넣는다.
 *
 * 표는 열이 고정인데 지표가 유형마다 달라서, 열을 늘리는 대신 한 칸 안에서 분기한다.
 * switch 가 세 경우를 다 덮어야 TS 가 통과시키므로 유형이 늘면 여기서 걸린다.
 *
 * 문구는 관심 목록과 같다 — '최대 5,000만 원'. 대출 유형만 이율을 앞에 붙인다.
 */
function supportAmount(program: SupportProgramListItem): string {
  switch (program.type) {
    case 'SUPPORT':
      return maxBalanceText(program.maxBalance)
    case 'LOAN':
      // 융자형인데 이율이 공고문에 없는 건이 있다. 그러면 금액만 적는다
      return program.interestRate === undefined
        ? maxBalanceText(program.maxBalance)
        : `연 ${program.interestRate.toFixed(1)}% · ${maxBalanceText(program.maxBalance)}`
    case 'ETC':
      return '—'
  }
}

/**
 * 지원사업 목록 표의 열 정의.
 *
 * 값의 모양은 관심 목록(FavoritesPage)이 기준이다 — 12.5px·tabular-nums·오른쪽 정렬,
 * 자격이 안 되는 줄은 흐리게. 마감도 관심 목록과 같은 '~ 9. 16' 이고 'D-5'·임박 빨강을
 * 넣지 않는다: 같은 공고가 화면마다 다른 말로 읽히면 저장해둔 것과 같은 것인지 확인해야
 * 한다. 급한 것은 대시보드의 '일주일 내 마감' 이 세어 준다.
 *
 * ⚠️ 북마크는 표시만 한다. 토글은 POST/DELETE /api/v1/bookmark/{id} 가 필요하고
 *    관심 목록 티켓 몫이다.
 */
export const supportColumns: Column<SupportProgramListItem>[] = [
  {
    key: 'name',
    header: '공고',
    render: (program) => (
      <div className="min-w-0">
        <b
          className={cn(
            'text-body2 block truncate font-medium',
            program.status === SUPPORT_STATUS.INELIGIBLE ? 'text-text-muted' : 'text-text',
          )}
        >
          {program.pblancNm}
        </b>
        <span className="text-text-muted block truncate text-[11px]">
          {program.jrsdInsttNm} · {SUPPORT_PROGRAM_TYPE_LABEL[program.type]}
        </span>
      </div>
    ),
  },
  {
    key: 'amount',
    header: '지원 내용',
    width: '210px',
    align: 'right',
    render: (program) => (
      <span
        className={cn(
          'text-[12.5px] tabular-nums',
          program.status === SUPPORT_STATUS.INELIGIBLE ? 'text-text-muted' : 'text-text',
        )}
      >
        {supportAmount(program)}
      </span>
    ),
  },
  {
    key: 'deadline',
    header: '접수',
    width: '114px',
    align: 'right',
    render: (program) => (
      <span
        className={cn(
          'text-[12.5px] tabular-nums',
          program.status === SUPPORT_STATUS.INELIGIBLE ? 'text-text-muted' : 'text-text-secondary',
        )}
      >
        {formatDeadlineDate(program.endDate)}
      </span>
    ),
  },
  {
    key: 'status',
    header: '상태',
    width: '114px',
    align: 'center',
    render: (program) => (
      /* 배지 폭이 문구 길이만큼 제각각이라 칸을 고정하고 배지를 늘려 맞춘다 */
      <ProductStatusBadge
        status={program.status}
        labels={SUPPORT_STATUS_LABEL}
        className="w-full justify-center"
      />
    ),
  },
  {
    key: 'bookmark',
    header: '저장',
    width: '70px',
    align: 'center',
    render: (program) => (
      <span className="flex justify-center">
        <BookmarkToggle
          programId={program.supportProgramId}
          type={BOOKMARK_TARGET.SUPPORT}
          /* ⚠️ 지원사업만 아직 isBookmark 다. 명세가 확정되면 bookmarked 로 바뀐다 */
          bookmarked={program.isBookmark}
          label={program.pblancNm}
        />
      </span>
    ),
  },
]
