import type { SupportProgramListItem } from '@/features/support-program/model/types'
import { SUPPORT_PROGRAM_TYPE_LABEL } from '@/features/support-program/model/types'
import { SUPPORT_STATUS_LABEL } from '@/shared/constants/productStatus'
import ProductStatusBadge from '@/shared/ui/ProductStatusBadge'
import type { Column } from '@/shared/ui/Table'
import { cn } from '@/shared/utils/cn'
import { formatDeadline, formatMoneyShort, isDeadlineNear } from '@/shared/utils/formatters'

/**
 * 지원 내용 한 칸에 type 별로 다른 내용을 넣는다.
 *
 * 표는 열이 고정인데 지표가 유형마다 달라서, 열을 늘리는 대신 한 칸 안에서 분기한다.
 * switch 가 세 경우를 다 덮어야 TS 가 통과시키므로 유형이 늘면 여기서 걸린다.
 */
function supportAmount(program: SupportProgramListItem): string {
  switch (program.type) {
    case 'SUPPORT':
      return `최대 ${formatMoneyShort(program.maxBalance)}`
    case 'LOAN':
      return `연 ${program.interestRate}% · 최대 ${formatMoneyShort(program.maxBalance)}`
    case 'ETC':
      return '—'
  }
}

/**
 * 지원사업 목록 표의 열 정의.
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
        <p className="text-body1 text-text truncate font-semibold">{program.pblancNm}</p>
        <p className="text-caption text-text-muted mt-0.5 truncate">
          {program.jrsdInsttNm} · {SUPPORT_PROGRAM_TYPE_LABEL[program.type]}
        </p>
      </div>
    ),
  },
  {
    key: 'amount',
    header: '지원 내용',
    width: '188px',
    align: 'right',
    render: (program) => <span className="text-body1 font-semibold">{supportAmount(program)}</span>,
  },
  {
    key: 'deadline',
    header: '접수',
    width: '80px',
    align: 'center',
    render: (program) => (
      <span
        className={cn(
          'text-body1 font-semibold',
          // 마감이 일주일 이내면 빨강. 이미 마감된 것과 상시는 서두를 이유가 없다
          isDeadlineNear(program.endDate) && 'text-danger',
        )}
      >
        {formatDeadline(program.endDate)}
      </span>
    ),
  },
  {
    key: 'status',
    header: '상태',
    width: '92px',
    align: 'center',
    render: (program) => (
      <ProductStatusBadge status={program.status} labels={SUPPORT_STATUS_LABEL} />
    ),
  },
  {
    key: 'bookmark',
    header: '저장',
    width: '58px',
    align: 'center',
    render: (program) => (
      <span className={program.isBookmark ? 'text-text' : 'text-text-disabled'}>
        {/* 컴포넌트로 빼면 이 파일이 컴포넌트를 export 하지 않아 fast refresh 규칙에 걸린다 */}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="mx-auto size-5"
          fill={program.isBookmark ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 3h12v18l-6-4-6 4z" />
        </svg>
      </span>
    ),
  },
]