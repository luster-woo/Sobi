import type { RepaymentProgress } from '@/features/loan-repayment/model/progress'
import Panel from '@/shared/ui/Panel'

interface RepaymentProgressPanelProps {
  progress: RepaymentProgress
}

/**
 * 총 상환 진행률.
 *
 * 성공한 회차만 센 값이다(model/progress.ts). 출금이 실패한 회차까지 세면 연체 중인
 * 사람에게 실제보다 많이 갚은 것처럼 보인다.
 */
export default function RepaymentProgressPanel({ progress }: RepaymentProgressPanelProps) {
  return (
    <Panel
      title="총 상환 진행률"
      headerRight={
        <span className="text-text text-[13.5px] font-bold tabular-nums">{progress.percent}%</span>
      }
    >
      <div className="flex flex-col gap-2.5 px-[15px] py-3.5">
        <div className="bg-bg-canvas h-1.5 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-[width]"
            style={{ width: `${progress.percent}%` }}
          />
        </div>

        <p className="text-text-secondary text-[11.5px] tabular-nums">
          {progress.totalCount}회 중 {progress.paidCount}회 완료 · 잔여 {progress.remainingCount}회
        </p>
      </div>
    </Panel>
  )
}
