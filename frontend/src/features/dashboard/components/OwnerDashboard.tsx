import BusinessSnapshotPanel from '@/features/dashboard/components/BusinessSnapshotPanel'
import InsuranceMiniPanel from '@/features/dashboard/components/InsuranceMiniPanel'
import JudgementSummaryPanel from '@/features/dashboard/components/JudgementSummaryPanel'
import LoanStrip from '@/features/dashboard/components/LoanStrip'
import RepaymentMiniPanel from '@/features/dashboard/components/RepaymentMiniPanel'
import SupportProgramStrip from '@/features/dashboard/components/SupportProgramStrip'
import type { OwnerDashboardData } from '@/features/dashboard/model/types'

interface OwnerDashboardProps {
  dashboard: OwnerDashboardData
}

/**
 * 사업자 대시보드 (S15P21D101-176) — 시안 10번.
 *
 * 두 열이 하는 일이 다르다. 왼쪽은 지금 신청할 수 있는 것(판정 요약 → 대출 → 지원금),
 * 오른쪽은 이미 벌어져 있는 것(상환일·미가입 보험·내 숫자)이다. 왼쪽은 위에서
 * 아래로 좁혀 읽고 오른쪽은 급한 것만 눈에 걸리면 되는 자리라, 섞으면 둘 다 읽기
 * 어려워진다.
 *
 * 폭에 상한을 두지 않는다. 목록 화면들은 max-w-[1120px] 로 묶여 있지만 여기는 카드
 * 스트립이 주인공이라, 상한을 두면 넓은 모니터에서 남는 자리를 여백으로 버리고 정작
 * 카드는 네 장에서 잘린다. 긴 글이 없어 줄 길이 문제도 생기지 않는다.
 *
 * 오른쪽 열은 320px 고정이고 lg 미만에서 아래로 내려간다. 좁은 화면에서 두 열을
 * 유지하면 카드 스트립이 한 장도 다 안 보인다.
 *
 * 의무보험은 자기 엔드포인트(`GET /insurance`)가 따로 있어 패널이 직접 받아온다.
 */
export default function OwnerDashboard({ dashboard }: OwnerDashboardProps) {
  const { judgement, loans, supportPrograms, repayment, snapshot } = dashboard

  return (
    <div className="grid w-full items-start gap-3.5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-3.5">
        {/*
         * 판정 조회가 실패하면 패널만 빠진다. 아래 스트립과 오른쪽 열은 그대로.
         * 다만 그때 스트립에 담기는 건 판정을 거치지 않은 추천 목록이라
         * '지원 가능한' 이라고 말할 수 없다 — 제목을 바꿔 넘긴다.
         */}
        {judgement && <JudgementSummaryPanel summary={judgement} />}
        <LoanStrip loans={loans} title={judgement ? undefined : '추천 대출'} />
        <SupportProgramStrip
          programs={supportPrograms}
          title={judgement ? undefined : '추천 정부 지원사업'}
        />
      </div>

      <div className="flex flex-col gap-3.5">
        {/* 대출이 없으면 상환할 것도 없다 */}
        {repayment && <RepaymentMiniPanel repayment={repayment} />}
        {/* 의무보험만 자기 API 를 쓴다. 나머지는 GET /dashboard 하나로 올 값들이다 */}
        <InsuranceMiniPanel />
        <BusinessSnapshotPanel snapshot={snapshot} />
      </div>
    </div>
  )
}
