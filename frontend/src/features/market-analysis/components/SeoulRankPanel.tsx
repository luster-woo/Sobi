import MiniPanel from '@/features/market-analysis/components/MiniPanel'
import { formatWonText } from '@/features/market-analysis/model/format'
import type { MarketAnalysis } from '@/features/market-analysis/model/types'
import { useAnimatedNumber } from '@/shared/hooks/useAnimatedNumber'

interface SeoulRankPanelProps {
  business: MarketAnalysis['business']
  summary: MarketAnalysis['summary']
  seoulRank: MarketAnalysis['seoulRank']
}

/**
 * 서울시 내 위치 — 매출 백분위.
 *
 * percentile 은 하위 기준(74 = 하위 74% 지점)이고 topPercent 는 그것을 뒤집은 값
 * (26 = 상위 26%)이다. 눈금 위치는 percentile 로 잡고 문구는 topPercent 로 쓴다 —
 * 사람은 "상위 몇 %" 로 읽고, 막대는 왼쪽부터 차오르기 때문이다.
 *
 * 눈금과 그 위의 숫자가 이전 값에서 새 값으로 미끄러진다. 상권을 바꿔 가며 비교하는
 * 화면이라 "올라갔나 내려갔나" 가 곧 정보인데, 값이 툭 바뀌면 그 방향이 사라진다.
 * 둘을 같은 훅으로 그리는 이유는 어긋나면 안 되기 때문이다 — 눈금은 오른쪽으로 가는데
 * 숫자가 아직 왼쪽 값이면 읽는 사람이 둘 중 무엇을 믿어야 할지 모른다.
 *
 * 문장 속 금액은 움직이지 않는다. 읽는 도중에 숫자가 굴러가면 문장을 다시 읽게 된다.
 * 움직여서 득이 되는 건 '위치' 를 말하는 두 값뿐이다.
 *
 * 눈금 라벨을 양 끝에서 8% 안쪽으로 묶는다. 상·하위 극단값일 때 라벨이 패널 밖으로
 * 삐져나가는 것을 막는다.
 *
 * seoulRank 는 매출이 집계되지 않은 상권에서 null 이다. 그 경우 순위 자체가 없으니
 * 패널을 그리지 않는다.
 */
export default function SeoulRankPanel({ business, summary, seoulRank }: SeoulRankPanelProps) {
  /*
   * 훅은 조건보다 먼저 부른다. seoulRank 가 null 인 상권을 오가면 훅 개수가 달라져
   * React 가 상태를 잘못 짚는다.
   *
   * 출발점을 반대 끝에 둔다. 눈금은 왼쪽(하위 0%)에서, 숫자는 '상위 100%' 에서
   * 시작해 둘이 같은 방향 — 아래에서 위로 — 으로 올라온다.
   */
  const percentile = useAnimatedNumber(clampPercent(seoulRank?.percentile ?? 0), { from: 0 })
  const topPercent = useAnimatedNumber(seoulRank?.topPercent ?? 100, { from: 100 })

  if (!seoulRank) return null

  const labelPercent = Math.max(8, Math.min(92, percentile))

  return (
    <MiniPanel title="서울시 내 위치">
      <div className="pt-5">
        <div className="relative">
          {/* 눈금 위 라벨. 눈금과 같은 자리에 두려고 절대 배치한다 */}
          <span
            className="text-text text-caption absolute -top-5 -translate-x-1/2 font-bold whitespace-nowrap tabular-nums"
            style={{ left: `${labelPercent}%` }}
          >
            상위 {Math.round(topPercent)}%
          </span>

          <div className="bg-bg-canvas h-2.5 rounded-full" />

          <span
            className="bg-text absolute top-1/2 h-4 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-sm"
            style={{ left: `${percentile}%` }}
          />
        </div>

        <div className="text-text-muted text-caption mt-1.5 flex justify-between">
          <span>하위</span>
          <span>중위</span>
          <span>상위</span>
        </div>
      </div>

      <p className="text-text-secondary text-caption leading-relaxed">
        점포당 월 매출 {formatWonText(summary.revenuePerStoreMonthly)}은 서울시 {business.name}{' '}
        행정동 가운데 상위 {seoulRank.topPercent}% 수준이에요. 서울 중위값은{' '}
        {formatWonText(seoulRank.seoulMedian)}입니다.
      </p>
    </MiniPanel>
  )
}

/** 서버가 범위를 벗어난 값을 줘도 눈금이 막대 밖으로 나가지 않게 */
function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value))
}
