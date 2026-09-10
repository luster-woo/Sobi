import { useNavigate } from 'react-router'

import NavButton from '@/features/dashboard/components/NavButton'
import { useBookmarkDraft } from '@/features/dashboard/hooks/useBookmarkDraft'
import { toAmountRange } from '@/features/dashboard/model/format'
import type { DashboardLoan, StripSummary } from '@/features/dashboard/model/types'
import { ROUTES, routeTo } from '@/shared/constants/routes'
import CardStrip from '@/shared/ui/CardStrip'
import EmptyState from '@/shared/ui/EmptyState'
import ProductCard from '@/shared/ui/ProductCard'

interface LoanStripProps {
  loans: StripSummary<DashboardLoan>
}

/**
 * 지원 가능한 대출 스트립.
 *
 * 알약에 상환 횟수만 둔다. 금리는 상품을 고르는 기준이지만 카드 넷을 나란히 놓고
 * 비교할 값이고, 여기는 "이 중에 볼 것이 있나" 를 훑는 자리다 — 금리 비교는 목록
 * 화면의 표가 훨씬 잘한다.
 */
export default function LoanStrip({ loans }: LoanStripProps) {
  const navigate = useNavigate()
  const bookmark = useBookmarkDraft(
    loans.items.filter((loan) => loan.isBookmark).map((loan) => loan.loanId),
  )

  if (loans.items.length === 0) {
    return (
      <EmptyState
        title="지금 신청할 수 있는 대출이 없어요"
        description="판정 기준은 매출·업력·신용도예요. 마이데이터를 갱신하면 다시 판정해드려요."
      />
    )
  }

  return (
    <CardStrip
      title="지원 가능한 대출"
      count={loans.possible}
      footer={
        <NavButton to={ROUTES.LOANS} variant="outline" size="sm" className="w-full">
          대출 자격 판정 전체 보기 · {loans.total}개 상품
        </NavButton>
      }
    >
      {loans.items.map((loan) => (
        <ProductCard
          key={loan.loanId}
          title={loan.accountName}
          organization={loan.bankName}
          chips={[`납입횟수 ${loan.period}회`]}
          amount={toAmountRange(loan.minLoanBalance, loan.maxLoanBalance)}
          isBookmarked={bookmark.isBookmarked(loan.loanId)}
          onToggleBookmark={() => bookmark.toggle(loan.loanId)}
          onClick={() => navigate(routeTo.loanDetail(loan.loanId))}
        />
      ))}
    </CardStrip>
  )
}
