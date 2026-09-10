import BusinessSnapshotPanel from '@/features/dashboard/components/BusinessSnapshotPanel'
import InsuranceMiniPanel from '@/features/dashboard/components/InsuranceMiniPanel'
import JudgementSummaryPanel from '@/features/dashboard/components/JudgementSummaryPanel'
import LoanStrip from '@/features/dashboard/components/LoanStrip'
import RepaymentMiniPanel from '@/features/dashboard/components/RepaymentMiniPanel'
import SupportProgramStrip from '@/features/dashboard/components/SupportProgramStrip'
import { MOCK_OWNER_DASHBOARD } from '@/features/dashboard/model/mock'

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
 * 오른쪽 열을 lg 미만에서 아래로 내린다. 시안은 292px 고정이지만 그대로 두면 좁은
 * 화면에서 카드 스트립이 한 장도 다 안 보인다.
 *
 * ⚠️ 값은 전부 목이다(model/mock.ts). `GET /dashboard` 가 붙으면 이 컴포넌트에서
 *    MOCK_OWNER_DASHBOARD 를 useQuery 결과로 바꾸고, 로딩·에러 처리를 여기 넣는다.
 */
export default function OwnerDashboard() {
  const { judgement, loans, supportPrograms, repayment, insurances, snapshot } =
    MOCK_OWNER_DASHBOARD

  return (
    <div className="grid w-full items-start gap-3.5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-3.5">
        <JudgementSummaryPanel summary={judgement} />
        <LoanStrip loans={loans} />
        <SupportProgramStrip programs={supportPrograms} />
      </div>

      <div className="flex flex-col gap-3.5">
        {/* 대출이 없으면 상환할 것도 없다 */}
        {repayment && <RepaymentMiniPanel repayment={repayment} />}
        <InsuranceMiniPanel insurances={insurances} />
        <BusinessSnapshotPanel snapshot={snapshot} />
      </div>
    </div>
  )
}
