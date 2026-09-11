import { useState } from 'react'

import NavButton from '@/features/dashboard/components/NavButton'
import { useBookmarkDraft } from '@/features/dashboard/hooks/useBookmarkDraft'
import { toAmountRange } from '@/features/dashboard/model/format'
import type { DashboardLoan, StripSummary } from '@/features/dashboard/model/types'
import LoanDetailModal from '@/features/loan/components/LoanDetailModal'
import { ROUTES } from '@/shared/constants/routes'
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
 *
 * 카드를 누르면 목록 화면과 같은 상세 모달이 이 자리에 뜬다. 주소를 바꾸지 않는
 * 이유: 대시보드에서 상품 하나를 확인하는 것은 잠깐 들여다보는 일이고, /loans 로
 * 옮겨 가면 닫았을 때 대시보드가 아니라 목록에 서 있게 된다.
 */
export default function LoanStrip({ loans }: LoanStripProps) {
  const [openLoanId, setOpenLoanId] = useState<number | null>(null)
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
    <>
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
            onClick={() => setOpenLoanId(loan.loanId)}
          />
        ))}
      </CardStrip>

      {openLoanId !== null && (
        <LoanDetailModal loanId={openLoanId} onClose={() => setOpenLoanId(null)} />
      )}
    </>
  )
}
