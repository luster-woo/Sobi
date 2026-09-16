import type { CSSProperties } from 'react'

import MiniPanel from '@/features/market-analysis/components/MiniPanel'
import { formatWonText } from '@/features/market-analysis/model/format'
import type { MarketAnalysis } from '@/features/market-analysis/model/types'

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
 * 눈금 라벨을 양 끝에서 8% 안쪽으로 묶는다. 상·하위 극단값일 때 라벨이 패널 밖으로
 * 삐져나가는 것을 막는다.
 *
 * seoulRank 는 매출이 집계되지 않은 상권에서 null 이다. 그 경우 순위 자체가 없으니
 * 패널을 그리지 않는다.
 */
export default function SeoulRankPanel({ business, summary, seoulRank }: SeoulRankPanelProps) {
  if (!seoulRank) return null

  const markerPercent = Math.max(0, Math.min(100, seoulRank.percentile))
  const labelPercent = Math.max(8, Math.min(92, markerPercent))

  return (
    <MiniPanel title="서울시 내 위치">
      <div className="pt-5">
        <div className="relative">
          {/*
            눈금 위 라벨. 눈금과 같은 자리에 두려고 절대 배치한다.

            라벨과 마커가 도착 지점이 다르다(라벨은 양 끝에서 잘리지 않게 8~92% 로
            눌러 둔다). 그래서 --marker-left 를 각자 갖고, keyframes 는 그 변수를
            읽어 제자리까지 미끄러진다.
          */}
          <span
            className="animate-slide-marker text-text absolute -top-5 -translate-x-1/2 text-[11.5px] font-bold whitespace-nowrap tabular-nums"
            style={
              { '--marker-left': `${labelPercent}%`, left: `${labelPercent}%` } as CSSProperties
            }
          >
            상위 {seoulRank.topPercent}%
          </span>

          <div className="bg-bg-canvas h-2.5 rounded-full" />

          <span
            className="animate-slide-marker bg-text absolute top-1/2 h-4 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-sm"
            style={
              { '--marker-left': `${markerPercent}%`, left: `${markerPercent}%` } as CSSProperties
            }
          />
        </div>

        <div className="text-text-muted mt-1.5 flex justify-between text-[11px]">
          <span>하위</span>
          <span>중위</span>
          <span>상위</span>
        </div>
      </div>

      <p className="text-text-secondary text-[11.5px] leading-relaxed">
        점포당 월 매출 {formatWonText(summary.revenuePerStoreMonthly)}은 서울시 {business.name}{' '}
        행정동 가운데 상위 {seoulRank.topPercent}% 수준이에요. 서울 중위값은{' '}
        {formatWonText(seoulRank.seoulMedian)}입니다.
      </p>
    </MiniPanel>
  )
}
