import { toPeopleParts } from '@/features/market-analysis/model/format'
import type { MarketAnalysis } from '@/features/market-analysis/model/types'
import type { StatTile } from '@/shared/ui/StatTiles'
import StatTiles from '@/shared/ui/StatTiles'
import { splitMoneyShort } from '@/shared/utils/formatters'

interface MarketSummaryTilesProps {
  location: MarketAnalysis['location']
  summary: MarketAnalysis['summary']
  storeChurn: MarketAnalysis['storeChurn']
}

/**
 * 상단 요약 타일 4개.
 *
 * 시안의 네 번째 칸은 '평균 임대료' 였는데 응답에 임대료가 없다. 빈 칸으로 두는 대신
 * 연 폐업률을 넣었다 — 예비창업자가 제일 알아야 할 숫자이고, storeChurn 에
 * seoulAvgCloseRate 가 같이 와서 아래 패널에서 비교까지 된다.
 *
 * 매출은 null 일 수 있어 splitMoneyShort 가 '-' 를 만든다. 칸을 빼지 않는 이유는, 칸 수가
 * 응답에 따라 3개·4개로 달라지면 grid 가 늘어나 다른 상권과 나란히 비교할 수 없다.
 */
export default function MarketSummaryTiles({
  location,
  summary,
  storeChurn,
}: MarketSummaryTilesProps) {
  const footTraffic = toPeopleParts(summary.dailyFootTraffic)
  const revenue = splitMoneyShort(summary.revenuePerStoreMonthly)

  const tiles: StatTile[] = [
    {
      label: `${location.dongName} 동종업종`,
      value: summary.storeCount.toLocaleString('ko-KR'),
      unit: '곳',
    },
    { label: '일평균 유동인구', ...footTraffic },
    { label: '동종 평균 매출 (월)', ...revenue },
    {
      label: '연 폐업률',
      // 점포가 0 곳이면 폐업률을 계산할 수 없다. '0%' 로 적으면 좋은 상권으로 읽힌다
      value: storeChurn.annualCloseRate?.toFixed(1) ?? '-',
      unit: storeChurn.annualCloseRate === null ? '' : '%',
    },
  ]

  return <StatTiles items={tiles} />
}
