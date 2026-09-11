import { formatPeopleText, formatWonText } from '@/features/market-analysis/model/format'
import type { MarketAnalysis, NeighborMarket } from '@/features/market-analysis/model/types'
import Panel from '@/shared/ui/Panel'
import type { Column } from '@/shared/ui/Table'
import Table from '@/shared/ui/Table'

interface NeighborTableProps {
  location: MarketAnalysis['location']
  neighbors: MarketAnalysis['neighbors']
}

/**
 * 주변 상권 비교.
 *
 * 시안의 '평균 임대료' 열은 응답에 임대료가 없어 뺐다. 대신 점포당 일 유동인구와
 * 연 폐업률을 넣었다 — 점포 수와 유동인구만으로는 "사람은 많은데 가게도 많다" 를
 * 구분할 수 없고, 폐업률은 예비창업자가 제일 알아야 할 숫자다.
 *
 * neighbors 에는 조회한 행정동 자신도 들어 있다. 그 행을 초록 배경으로 강조해서
 * 주변과 어디가 다른지 바로 보이게 한다.
 */
export default function NeighborTable({ location, neighbors }: NeighborTableProps) {
  const columns: Column<NeighborMarket>[] = [
    { key: 'dongName', header: '행정동', render: (row) => row.dongName },
    {
      key: 'storeCount',
      header: '동종업종',
      align: 'right',
      render: (row) => `${row.storeCount.toLocaleString('ko-KR')}곳`,
    },
    {
      key: 'dailyFootTraffic',
      header: '일 유동인구',
      align: 'right',
      render: (row) => formatPeopleText(row.dailyFootTraffic),
    },
    {
      key: 'footTrafficPerStoreDaily',
      header: '점포당 유동인구',
      align: 'right',
      render: (row) => `${row.footTrafficPerStoreDaily.toLocaleString('ko-KR')}명`,
    },
    {
      key: 'revenuePerStoreMonthly',
      header: '평균 매출 (월)',
      align: 'right',
      // 매출은 null 이 올 수 있다. formatWonText 가 '-' 를 만든다
      render: (row) => formatWonText(row.revenuePerStoreMonthly),
    },
    {
      key: 'annualCloseRate',
      header: '연 폐업률',
      align: 'right',
      render: (row) => `${row.annualCloseRate.toFixed(1)}%`,
    },
  ]

  return (
    <Panel title="주변 상권 비교">
      <Table
        caption={`${location.districtName} 행정동별 동종업종 비교`}
        columns={columns}
        rows={neighbors}
        getRowId={(row) => row.dongCode}
        bordered={false}
        rowClassName={(row) =>
          row.dongCode === location.dongCode ? 'bg-primary-soft font-medium' : undefined
        }
      />
    </Panel>
  )
}
