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
 * 오른쪽 열은 320px 고정이고 lg 미만에서 아래로 내려간다. 좁은 화면에서 두 열을
 * 유지하면 카드 스트립이 한 장도 다 안 보인다.
 *
 * ⚠️ 의무보험을 뺀 나머지는 아직 목이다(model/mock.ts). `GET /dashboard` 가 붙으면
 *    MOCK_OWNER_DASHBOARD 를 useQuery 결과로 바꾸고, 로딩·에러 처리를 여기 넣는다.
 *    의무보험은 자기 엔드포인트(`GET /insurance`)가 따로 있어 패널이 직접 받아온다.
 */
export default function OwnerDashboard() {
  const { judgement, loans, supportPrograms, repayment, snapshot } = MOCK_OWNER_DASHBOARD

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
        {/* 의무보험만 자기 API 를 쓴다. 나머지는 GET /dashboard 하나로 올 값들이다 */}
        <InsuranceMiniPanel />
        <BusinessSnapshotPanel snapshot={snapshot} />
      </div>
    </div>
  )
}
