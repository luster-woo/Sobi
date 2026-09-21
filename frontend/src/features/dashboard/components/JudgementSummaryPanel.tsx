import { toDotDate } from '@/features/dashboard/model/format'
import type { JudgementSummary } from '@/features/dashboard/model/types'
import Panel from '@/shared/ui/Panel'

interface JudgementSummaryPanelProps {
  summary: JudgementSummary
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-text-muted text-[11px]">{label}</dt>
      <dd className="text-text-secondary text-[16px] font-medium tabular-nums">{value}</dd>
    </div>
  )
}

/**
 * 자격 판정 요약 (시안의 .panel.hero).
 *
 * 대시보드에서 제일 먼저 읽히는 숫자다. 판정 결과 52건 중 신청할 수 있는 18건만
 * 크게 띄우고 나머지는 옆에 작게 붙인다 — 사용자가 여기서 알아야 할 것은 지금 할 수
 * 있는 일의 개수이고, 불가 34건은 왜 안 되는지 확인할 때 목록에서 볼 값이다.
 *
 * 갱신일을 숫자 위에 두는 이유: 판정은 마이데이터 스냅샷으로 낸 결과다. 며칠 전
 * 데이터라면 지금 매출과 다를 수 있는데, 그 사실을 숫자 아래에 적으면 이미 숫자를
 * 믿은 뒤에 읽게 된다.
 *
 * '신청 가능한 자금 N건 보기' 버튼을 두지 않는다. 대출과 지원금을 한 번에 보는 화면이
 * 없어서 어느 쪽으로 보내도 절반은 틀리고, 바로 아래 두 스트립에 각자의 전체 보기가
 * 이미 있다.
 */
export default function JudgementSummaryPanel({ summary }: JudgementSummaryPanelProps) {
  const { updatedAt, possible, needsCheck, urgent, impossible, inProgress, total } = summary

  return (
    <Panel className="flex flex-col gap-3 px-4.5 py-4">
      <p className="text-text-muted text-[11.5px]">
        {/* 예비창업자는 마이데이터가 없어 갱신일도 없다 */}
        자격 판정{updatedAt && ` · 마이데이터 ${toDotDate(updatedAt)} 갱신`}
      </p>

      <div className="flex flex-wrap items-end justify-between gap-4.5">
        <p className="flex items-baseline gap-[7px]">
          <strong className="text-primary text-[33px] leading-[1.05] font-bold tracking-tight tabular-nums">
            {possible}
          </strong>
          <span className="text-text-secondary text-body2">건 신청 가능</span>
        </p>

        <dl className="flex gap-4.5">
          {/* 마감 임박은 신청 가능 안에 든 수다. 나머지 넷을 더하면 전체가 된다 */}
          <Stat label="일주일 내 마감" value={urgent} />
          <Stat label="확인 필요" value={needsCheck} />
          <Stat label="신청 불가" value={impossible} />
          {inProgress > 0 && <Stat label="진행 중" value={inProgress} />}
          <Stat label="전체" value={total} />
        </dl>
      </div>
    </Panel>
  )
}
