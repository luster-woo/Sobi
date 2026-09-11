import MiniPanel from '@/features/market-analysis/components/MiniPanel'
import { formatWonText, toWonParts } from '@/features/market-analysis/model/format'
import type { MarketAnalysis } from '@/features/market-analysis/model/types'

interface RevenueEstimatePanelProps {
  summary: MarketAnalysis['summary']
  seoulRank: MarketAnalysis['seoulRank']
}

/**
 * 월 매출 추정 — 점포 한 곳의 월 매출과 서울 기준선.
 *
 * 시안의 두 번째 줄은 '임대료 180만 원 기준 손익분기 1,950만 원' 이었는데 응답에
 * 임대료가 없어 계산할 수 없다. 대신 서울 평균·중위·상위 25% 를 나란히 둔다 —
 * 손익분기가 "얼마 벌어야 하나" 였다면 이쪽은 "이 정도면 잘하는 건가" 에 답한다.
 *
 * 매출이 null 인 경우를 예외가 아니라 기본 경로로 다룬다. 원본 통계에서 매출 컬럼이
 * 빈 행이 53% 라 절반 가까이가 이쪽으로 온다. 패널을 숨기지 않는 이유는, 사라지면
 * 옆 열 높이가 바뀌어 화면이 흔들리고 "왜 없지" 를 알 수 없기 때문이다.
 *
 * ⚠️ revenuePerStoreBenchmark.seoulTop25 가 '서울 전체 상위 25%' 인지 '같은 업종
 *    상위 25%' 인지 확인 대기 중이다. 지금 문구는 동종업종 기준으로 썼다.
 */
export default function RevenueEstimatePanel({ summary, seoulRank }: RevenueEstimatePanelProps) {
  const revenue = toWonParts(summary.revenuePerStoreMonthly)
  const benchmark = summary.revenuePerStoreBenchmark

  if (summary.revenuePerStoreMonthly === null) {
    return (
      <MiniPanel title="월 매출 추정">
        <p className="text-text-disabled text-[25px] leading-none font-bold">-</p>
        <p className="text-text-secondary text-[11.5px] leading-relaxed">
          이 상권은 매출이 집계되지 않았어요. 점포 수와 유동인구로 판단해주세요.
        </p>
      </MiniPanel>
    )
  }

  const lines: string[] = []
  if (benchmark) {
    lines.push(`동종업종 상위 25% · ${formatWonText(benchmark.seoulTop25)}`)
    lines.push(`서울 평균 · ${formatWonText(benchmark.seoulAvg)}`)
    lines.push(`서울 중위 · ${formatWonText(benchmark.seoulMedian)}`)
  }
  if (seoulRank) {
    lines.push(`서울 상위 ${seoulRank.topPercent}% 수준`)
  }

  return (
    <MiniPanel title="월 매출 추정">
      <p className="text-text text-[25px] leading-none font-bold tracking-tight tabular-nums">
        {revenue.value}
        <small className="text-text-secondary text-[14px] font-normal">{revenue.unit}</small>
      </p>

      {lines.length > 0 && (
        <div className="text-text-secondary flex flex-col gap-1 text-[11.5px] tabular-nums">
          {lines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      )}
    </MiniPanel>
  )
}
