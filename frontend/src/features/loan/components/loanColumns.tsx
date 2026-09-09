import type { LoanListItem } from '@/features/loan/model/types'
import { LOAN_STATUS_LABEL } from '@/shared/constants/productStatus'
import ProductStatusBadge from '@/shared/ui/ProductStatusBadge'
import type { Column } from '@/shared/ui/Table'
import { formatMoneyShort } from '@/shared/utils/formatters'

/**
 * 대출 목록 표의 열 정의.
 *
 * model 이 아니라 components 에 둔 이유: render 가 JSX 를 반환해서 화면 코드입니다.
 * model 은 통신도 렌더링도 하지 않는 것만 둡니다.
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
        <p className="text-body1 text-text truncate font-semibold">{loan.accountName}</p>
        <p className="text-caption text-text-muted mt-0.5 truncate">{loan.bankName}</p>
      </div>
    ),
  },
  {
    key: 'interestRate',
    header: '금리',
    width: '96px',
    align: 'right',
    render: (loan) => <span className="text-body1 font-semibold">연 {loan.interestRate}%</span>,
  },
  {
    key: 'maxLoanBalance',
    header: '한도',
    width: '116px',
    align: 'right',
    render: (loan) => (
      <span className="text-body1 font-semibold">{formatMoneyShort(loan.maxLoanBalance)}</span>
    ),
  },
  {
    key: 'status',
    header: '상태',
    width: '92px',
    align: 'center',
    render: (loan) => <ProductStatusBadge status={loan.status} labels={LOAN_STATUS_LABEL} />,
  },
  {
    key: 'bookmark',
    header: '저장',
    width: '58px',
    align: 'center',
    render: (loan) => (
      <span className={loan.isBookmark ? 'text-text' : 'text-text-disabled'}>
        {/*
         * 컴포넌트로 빼지 않고 인라인으로 둡니다. 이 파일은 컴포넌트를 export 하지 않아서
         * 컴포넌트를 정의하면 fast refresh 규칙(react-refresh/only-export-components)에 걸립니다.
         */}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="mx-auto size-5"
          fill={loan.isBookmark ? 'currentColor' : 'none'}
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
