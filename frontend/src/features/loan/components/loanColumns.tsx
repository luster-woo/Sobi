import type { LoanListItem } from '@/features/loan/model/types'
import { LOAN_STATUS_LABEL, PRODUCT_STATUS } from '@/shared/constants/productStatus'
import BookmarkIcon from '@/shared/ui/BookmarkIcon'
import ProductStatusBadge from '@/shared/ui/ProductStatusBadge'
import type { Column } from '@/shared/ui/Table'
import { cn } from '@/shared/utils/cn'
import { formatMoneyShort } from '@/shared/utils/formatters'

/**
 * 대출 목록 표의 열 정의.
 *
 * model 이 아니라 components 에 둔 이유: render 가 JSX 를 반환해서 화면 코드입니다.
 * model 은 통신도 렌더링도 하지 않는 것만 둡니다.
 *
 * 값의 모양은 관심 목록(FavoritesPage)이 기준입니다 — 12.5px·tabular-nums·오른쪽 정렬,
 * 자격이 안 되는 줄은 흐리게. 같은 상품이 관심 목록과 이 표에서 다르게 보이면 저장해둔
 * 것을 다시 찾을 때 같은 것인지 확인해야 합니다.
 *
 * ⚠️ 북마크는 지금 표시만 합니다. 토글은 POST/DELETE /api/v1/bookmark/{id} 가 필요하고
 *    그건 관심 목록 티켓 몫입니다. 누르면 아무 일도 안 나는 버튼을 두는 것보다
 *    아이콘으로 상태만 보여주는 편이 낫습니다.
 */
export const loanColumns: Column<LoanListItem>[] = [
  {
    key: 'name',
    header: '상품',
    render: (loan) => (
      <div className="min-w-0">
        <b
          className={cn(
            'text-body2 block truncate font-medium',
            loan.status === PRODUCT_STATUS.IMPOSSIBLE ? 'text-text-muted' : 'text-text',
          )}
        >
          {loan.accountName}
        </b>
        <span className="text-text-muted block truncate text-[11px]">{loan.bankName}</span>
      </div>
    ),
  },
  {
    key: 'interestRate',
    header: '금리',
    width: '110px',
    align: 'right',
    render: (loan) => (
      <span
        className={cn(
          'text-[12.5px] tabular-nums',
          loan.status === PRODUCT_STATUS.IMPOSSIBLE ? 'text-text-muted' : 'text-text',
        )}
      >
        {/* 관심 목록이 소수점 한 자리로 맞춰 읽는다. 3 과 3.5 가 섞이면 자릿수가 흔들린다 */}연{' '}
        {loan.interestRate.toFixed(1)}%
      </span>
    ),
  },
  {
    key: 'maxLoanBalance',
    header: '한도',
    width: '138px',
    align: 'right',
    render: (loan) => (
      <span
        className={cn(
          'text-[12.5px] tabular-nums',
          loan.status === PRODUCT_STATUS.IMPOSSIBLE ? 'text-text-muted' : 'text-text',
        )}
      >
        최대 {formatMoneyShort(loan.maxLoanBalance)}
      </span>
    ),
  },
  {
    key: 'status',
    header: '상태',
    width: '114px',
    align: 'center',
    render: (loan) => (
      /*
       * 배지 폭이 문구 길이만큼 제각각이라('불가' 대 '신청 완료') 가운데 정렬하면 줄마다
       * 좌우로 흔들린다. 칸을 고정하고 배지를 늘려 맞춘다 — 관심 목록과 같은 처리다.
       */
      <ProductStatusBadge
        status={loan.status}
        labels={LOAN_STATUS_LABEL}
        className="w-full justify-center"
      />
    ),
  },
  {
    key: 'bookmark',
    header: '저장',
    width: '70px',
    align: 'center',
    render: (loan) => (
      <span
        className={cn('flex justify-center', loan.isBookmark ? 'text-text' : 'text-text-disabled')}
      >
        <BookmarkIcon filled={loan.isBookmark} />
      </span>
    ),
  },
]
