import { useState } from 'react'

import NavButton from '@/features/dashboard/components/NavButton'
import { toAmountRange, toDeadlineChip } from '@/features/dashboard/model/format'
import type { DashboardSupportProgram, StripSummary } from '@/features/dashboard/model/types'
import SupportProgramDetailModal from '@/features/support-program/components/SupportProgramDetailModal'
import { ROUTES } from '@/shared/constants/routes'
import { useBookmarkedIds } from '@/shared/hooks/useBookmarkedIds'
import { useBookmarkToggle } from '@/shared/hooks/useBookmarkToggle'
import { BOOKMARK_TARGET } from '@/shared/types'
import CardStrip from '@/shared/ui/CardStrip'
import EmptyState from '@/shared/ui/EmptyState'
import ProductCard from '@/shared/ui/ProductCard'

interface SupportProgramStripProps {
  programs: StripSummary<DashboardSupportProgram>
  /** 판정이 없는 예비창업자 화면은 '지원 가능한' 이라고 말할 수 없다 */
  title?: string
}

/** 마감일 + (지원대출이면) 금리. 금리가 없는 지원금에 '금리 -' 를 붙이지 않는다 */
function toChips(program: DashboardSupportProgram): string[] {
  const chips = [toDeadlineChip(program.endDate)]
  if (program.interestRate !== null) chips.push(`금리 ${program.interestRate.toFixed(1)}%`)
  return chips
}

/** 훅을 카드마다 하나씩 갖게 하려고 뺐다 — `LoanStrip` 의 `LoanCard` 와 같은 이유다 */
function SupportProgramCard({
  program,
  bookmarked,
  onClick,
}: {
  program: DashboardSupportProgram
  bookmarked: boolean
  onClick: () => void
}) {
  const toggle = useBookmarkToggle()
  const shown = toggle.isPending ? toggle.variables.next : bookmarked

  return (
    <ProductCard
      title={program.pblancNm}
      organization={program.jrsdInsttNm}
      chips={toChips(program)}
      amount={toAmountRange(program.minBalance, program.maxBalance)}
      isBookmarked={shown}
      onToggleBookmark={() =>
        toggle.mutate({
          programId: program.supportProgramId,
          type: BOOKMARK_TARGET.SUPPORT,
          next: !shown,
        })
      }
      onClick={onClick}
    />
  )
}

/**
 * 지원 가능한 정부 지원금 스트립.
 *
 * 대출과 알약이 다르다. 대출은 상시 접수가 많아 마감일이 큰 정보가 아니지만 지원사업은
 * 공고마다 접수 기간이 있고, 그것을 놓치면 다음 공고까지 1년을 기다린다.
 *
 * 날짜를 'D-19' 가 아니라 '~9.29' 로 적는다. 남은 날짜는 지금 급한지를 알려주지만
 * 달력에 적으려면 다시 계산해야 한다.
 */
export default function SupportProgramStrip({
  programs,
  title = '지원 가능한 정부 지원사업',
}: SupportProgramStripProps) {
  const [openProgramId, setOpenProgramId] = useState<number | null>(null)

  // 대시보드 응답에 북마크 여부가 없어서 관심 목록으로 대조한다 (`useBookmarkedIds`)
  const bookmarked = useBookmarkedIds()

  if (programs.items.length === 0) {
    return (
      <EmptyState
        title="지금 신청할 수 있는 지원사업이 없어요"
        description="공고는 수시로 올라와요. 새 공고가 조건에 맞으면 알림으로 알려드려요."
      />
    )
  }

  return (
    <>
      <CardStrip
        title={title}
        count={programs.possible}
        footer={
          <NavButton to={ROUTES.SUPPORT_PROGRAMS} variant="outline" size="sm" className="w-full">
            지원금 자격 판정 전체 보기 · {programs.total}개 사업
          </NavButton>
        }
      >
        {programs.items.map((program) => (
          <SupportProgramCard
            key={program.supportProgramId}
            program={program}
            bookmarked={bookmarked.support.has(program.supportProgramId)}
            onClick={() => setOpenProgramId(program.supportProgramId)}
          />
        ))}
      </CardStrip>

      {openProgramId !== null && (
        <SupportProgramDetailModal
          supportProgramId={openProgramId}
          onClose={() => setOpenProgramId(null)}
        />
      )}
    </>
  )
}
