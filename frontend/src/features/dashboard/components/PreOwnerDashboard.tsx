import BusinessVerifyPromoCard from '@/features/dashboard/components/BusinessVerifyPromoCard'
import InsuranceMiniPanel from '@/features/dashboard/components/InsuranceMiniPanel'
import JudgementSummaryPanel from '@/features/dashboard/components/JudgementSummaryPanel'
import LoanStrip from '@/features/dashboard/components/LoanStrip'
import StoreConditionPanel from '@/features/dashboard/components/StoreConditionPanel'
import SupportProgramStrip from '@/features/dashboard/components/SupportProgramStrip'
import type { PreOwnerDashboardData } from '@/features/dashboard/model/types'

interface PreOwnerDashboardProps {
  dashboard: PreOwnerDashboardData
}

/**
 * 예비창업자 대시보드 (S15P21D101-178) — 시안 10-1.
 *
 * 사업자 대시보드와 같은 2단 골격이고 왼쪽도 똑같이 판정 요약 + 스트립 둘이다.
 * 예비창업자라고 해서 화면이 비어 보이면 안 된다 — 판정할 근거가 적을 뿐 받을 수 있는
 * 자금은 있다. 판정 요약의 갱신일만 빠진다(마이데이터가 없다).
 *
 * 조건 입력을 오른쪽 열 맨 아래로 내렸다. 한 번 채우면 다시 볼 일이 없는 입력이라
 * 왼쪽 맨 위를 차지하면 매번 들어올 때마다 스크롤해야 카드를 본다.
 *
 * 오른쪽은 상환·매출 대신 다음 단계(사업자 인증)와 미리 알아둘 것(의무보험), 그리고
 * 조건 입력이 온다. 아직 갚을 것도 벌어들인 것도 없는 사용자다.
 */
export default function PreOwnerDashboard({ dashboard }: PreOwnerDashboardProps) {
  const { condition, judgement, loans, supportPrograms, insurances } = dashboard

  return (
    <div className="grid w-full items-start gap-3.5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-3.5">
        <JudgementSummaryPanel summary={judgement} />
        <LoanStrip loans={loans} title="미리 보는 대출" />
        <SupportProgramStrip programs={supportPrograms} title="미리 보는 정부 지원사업" />
      </div>

      <div className="flex flex-col gap-3.5">
        <BusinessVerifyPromoCard />
        <InsuranceMiniPanel insurances={insurances} variant="reference" />
        <StoreConditionPanel condition={condition} />
      </div>
    </div>
  )
}
