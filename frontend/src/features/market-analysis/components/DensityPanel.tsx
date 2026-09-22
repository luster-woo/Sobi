import ComparisonBar from '@/features/market-analysis/components/ComparisonBar'
import {
  DENSITY_LABEL,
  DENSITY_MESSAGE,
  DENSITY_VARIANT,
  findLooserNeighbor,
  getDensityLevel,
} from '@/features/market-analysis/model/density'
import type { MarketAnalysis } from '@/features/market-analysis/model/types'
import Badge from '@/shared/ui/Badge'
import Panel from '@/shared/ui/Panel'

interface DensityPanelProps {
  location: MarketAnalysis['location']
  density: MarketAnalysis['density']
  neighbors: MarketAnalysis['neighbors']
}

/** '868곳'. 서울·자치구 평균은 소수점이 붙어 와서(137.8) 반올림한다 */
const storeText = (count: number) => `${Math.round(count).toLocaleString('ko-KR')}곳`

/**
 * 동종업종 밀집도 — 지역 평균 대비.
 *
 * 시안은 자치구 평균과 조회 동 두 줄인데, 응답에 서울 평균(density.seoulAvg)도 와서
 * 세 줄로 늘렸다. 서울 138 / 마포구 202 / 서교동 868 처럼 두 단계로 좁혀 보여주면
 * "이 동이 유별난가" 를 한눈에 판단할 수 있다.
 *
 * 막대 길이는 세 값 중 최댓값을 100% 로 잡는다. 조회 동이 평균보다 훨씬 클 때가
 * 많아서, 평균을 기준으로 잡으면 막대가 칸을 넘어간다.
 */
export default function DensityPanel({ location, density, neighbors }: DensityPanelProps) {
  const level = getDensityLevel(density.dong, density.districtAvg)
  const looser = findLooserNeighbor(neighbors, location.dongCode, density.dong)

  const max = Math.max(density.seoulAvg, density.districtAvg, density.dong, 1)

  const rows = [
    { label: '서울 평균', count: density.seoulAvg, highlight: false },
    { label: `${location.districtName} 평균`, count: density.districtAvg, highlight: false },
    { label: location.dongName, count: density.dong, highlight: true },
  ]

  return (
    <Panel
      title="동종업종 밀집도 — 지역 평균 대비"
      headerRight={<Badge variant={DENSITY_VARIANT[level]}>{DENSITY_LABEL[level]}</Badge>}
    >
      <div className="px-card flex flex-col gap-2.5 py-3.5">
        {rows.map((row) => (
          <ComparisonBar
            key={row.label}
            label={row.label}
            value={storeText(row.count)}
            ratio={row.count / max}
            highlight={row.highlight}
            labelWidth={72}
            valueWidth={52}
          />
        ))}

        <p className="text-text-secondary text-caption mt-0.5 leading-relaxed">
          {DENSITY_MESSAGE[level]}
          {looser && (
            <>
              {' '}
              인근 {looser.dongName}은 동종업종이 {storeText(looser.storeCount)}으로 밀집도가
              낮습니다.
            </>
          )}
        </p>
      </div>
    </Panel>
  )
}
