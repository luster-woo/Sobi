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
        <span className="text-text text-body2 font-bold tabular-nums">{progress.percent}%</span>
      }
    >
      <div className="px-card flex flex-col gap-2.5 py-3.5">
        <div className="bg-bg-canvas h-1.5 overflow-hidden rounded-full">
          {/* 상권 분석 막대보다 느리게 찬다. 화면에 하나뿐이라 끝까지 볼 여유가 있다 */}
          <div
            className="bg-primary animate-grow-bar-slow h-full rounded-full"
            style={{ width: `${progress.percent}%` }}
          />
        </div>

        <p className="text-text-secondary text-caption tabular-nums">
          {progress.totalCount}회 중 {progress.paidCount}회 완료 · 잔여 {progress.remainingCount}회
        </p>
      </div>
    </Panel>
  )
}
