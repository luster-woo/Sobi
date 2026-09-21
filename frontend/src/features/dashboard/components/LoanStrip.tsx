import { useState } from 'react'

import NavButton from '@/features/dashboard/components/NavButton'
import { toAmountRange } from '@/features/dashboard/model/format'
import type { DashboardLoan, StripSummary } from '@/features/dashboard/model/types'
import LoanDetailModal from '@/features/loan/components/LoanDetailModal'
import { ROUTES } from '@/shared/constants/routes'
import { useBookmarkedIds } from '@/shared/hooks/useBookmarkedIds'
import { useBookmarkToggle } from '@/shared/hooks/useBookmarkToggle'
import { BOOKMARK_TARGET } from '@/shared/types'
import CardStrip from '@/shared/ui/CardStrip'
import EmptyState from '@/shared/ui/EmptyState'
import ProductCard from '@/shared/ui/ProductCard'

interface LoanStripProps {
  loans: StripSummary<DashboardLoan>
  /** 판정이 없는 예비창업자 화면은 '지원 가능한' 이라고 말할 수 없다 */
  title?: string
}

/**
 * 카드 한 장.
 *
 * 컴포넌트로 뺀 이유는 훅 때문이다. `loans.items.map` 안에서 `useBookmarkToggle` 을
 * 부르면 카드 수만큼 훅이 불려 규칙 위반이고, 스트립에서 하나만 부르면 한 장을 눌렀을 때
 * 네 장이 다 눌린 것처럼 보인다(`isPending` 을 공유해서다). 목록 화면의
 * `BookmarkToggle` 이 같은 이유로 컴포넌트다.
 */
function LoanCard({
  loan,
  bookmarked,
  onClick,
}: {
  loan: DashboardLoan
  bookmarked: boolean
  onClick: () => void
}) {
  const toggle = useBookmarkToggle()
  // 응답을 기다리면 리본이 한 박자 늦게 바뀐다. 누르는 동안에는 눌릴 결과를 먼저 보여준다
  const shown = toggle.isPending ? toggle.variables.next : bookmarked

  return (
    <ProductCard
      title={loan.accountName}
      organization={loan.bankName}
      chips={[`기간 ${loan.period}일`]}
      amount={toAmountRange(loan.minLoanBalance, loan.maxLoanBalance)}
      isBookmarked={shown}
      onToggleBookmark={() =>
        toggle.mutate({ programId: loan.loanId, type: BOOKMARK_TARGET.LOAN, next: !shown })
      }
      onClick={onClick}
    />
  )
}

/**
 * 지원 가능한 대출 스트립.
 *
 * 알약에 대출 기간만 둔다. 상세 모달·관심 목록과 같은 '일' 단위를 쓴다. 금리는 상품을
 * 고르는 기준이지만 카드 넷을 나란히 놓고 비교할 값이고, 여기는 "이 중에 볼 것이 있나"
 * 를 훑는 자리다 — 금리 비교는 목록 화면의 표가 훨씬 잘한다.
 *
 * 카드를 누르면 목록 화면과 같은 상세 모달이 이 자리에 뜬다. 주소를 바꾸지 않는
 * 이유: 대시보드에서 상품 하나를 확인하는 것은 잠깐 들여다보는 일이고, /loans 로
 * 옮겨 가면 닫았을 때 대시보드가 아니라 목록에 서 있게 된다.
 */
export default function LoanStrip({ loans, title = '지원 가능한 대출' }: LoanStripProps) {
  const [openLoanId, setOpenLoanId] = useState<number | null>(null)

  /*
   * 대시보드 응답에 북마크 여부가 없어서 관심 목록으로 대조한다.
   * 백엔드가 `isBookmark` 를 실어 주면 이 조회를 지우고 `loan.isBookmark` 를 쓰면 된다.
   */
  const bookmarked = useBookmarkedIds()

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
        title={title}
        count={loans.possible}
        footer={
          <NavButton to={ROUTES.LOANS} variant="outline" size="sm" className="w-full">
            대출 자격 판정 전체 보기 · {loans.total}개 상품
          </NavButton>
        }
      >
        {loans.items.map((loan) => (
          <LoanCard
            key={loan.loanId}
            loan={loan}
            bookmarked={bookmarked.loan.has(loan.loanId)}
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
