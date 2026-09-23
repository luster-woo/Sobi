import {
  formatPeopleCountText,
  formatPeopleText,
  formatPercentText,
  formatWonText,
} from '@/features/market-analysis/model/format'
import {
  COMPARE_COUNT,
  HEAT_METRIC_SPEC,
  type HeatMetric,
} from '@/features/market-analysis/model/heatMetric'
import type { MarketAnalysis, NeighborMarket } from '@/features/market-analysis/model/types'
import Panel from '@/shared/ui/Panel'
import type { Column } from '@/shared/ui/Table'
import Table from '@/shared/ui/Table'
import { cn } from '@/shared/utils/cn'

interface NeighborTableProps {
  location: MarketAnalysis['location']
  /** 지도와 같은 목록. 고른 지표 기준 상위 동들이 넘어온다 */
  neighbors: MarketAnalysis['neighbors']
  /** 지금 어떤 지표로 줄을 세웠는지. 머리말에 밝혀 준다 */
  metric: HeatMetric
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
/**
 * 표에 세울 행.
 *
 * 조회한 동이 상위 목록에도 들어 있으면 같은 동이 두 줄에 나온다. 그건 의도다 —
 * 맨 윗줄은 '내가 보고 있는 상권' 이라는 고정석이고, 아래는 순위표다. 그래서 React 가
 * 두 줄을 구분할 수 있게 키를 따로 만든다. dongCode 를 그대로 쓰면 키가 겹친다.
 */
interface NeighborRow extends NeighborMarket {
  rowKey: string
  /** 맨 윗줄에 고정된 행인가. 조회한 상권이 순위에도 있으면 아래 줄과 이것으로 갈린다 */
  pinned: boolean
}

/**
 * 그 행의 값에 입힐 굵기.
 *
 * tr 에 font-bold 를 줘도 먹지 않는다. Table 의 td 가 text-body2 를 달고 있고 그 토큰이
 * font-weight: 400 을 직접 박아서, 상속으로 내려온 굵기를 셀에서 덮어 버린다.
 * 그래서 셀마다 값을 감싸 굵기를 입힌다.
 *
 * 고정석은 굵게, 순위표 안의 같은 동은 한 단계 약하게. 둘 다 같은 무게면 어느 쪽이
 * 기준인지 눈이 못 고른다.
 */
function cellClass(row: NeighborRow, currentDongCode: string): string | undefined {
  if (row.pinned) return 'font-bold'
  if (row.dongCode === currentDongCode) return 'font-medium'

  return undefined
}

export default function NeighborTable({ location, neighbors, metric }: NeighborTableProps) {
  const current = neighbors.find((neighbor) => neighbor.dongCode === location.dongCode)
  const top = neighbors.slice(0, COMPARE_COUNT)

  const rows: NeighborRow[] = [
    ...(current ? [{ ...current, rowKey: `current-${current.dongCode}`, pinned: true }] : []),
    ...top.map((neighbor) => ({ ...neighbor, rowKey: neighbor.dongCode, pinned: false })),
  ]

  const columns: Column<NeighborRow>[] = [
    {
      key: 'dongName',
      header: '행정동',
      render: (row) => (
        <span className={cellClass(row, location.dongCode)}>
          {row.pinned ? `${row.dongName} (현재)` : row.dongName}
        </span>
      ),
    },
    {
      key: 'storeCount',
      header: '동종업종',
      align: 'right',
      render: (row) => (
        <span className={cellClass(row, location.dongCode)}>
          {`${row.storeCount.toLocaleString('ko-KR')}곳`}
        </span>
      ),
    },
    {
      key: 'dailyFootTraffic',
      header: '일 유동인구',
      align: 'right',
      render: (row) => (
        <span className={cellClass(row, location.dongCode)}>
          {formatPeopleText(row.dailyFootTraffic)}
        </span>
      ),
    },
    {
      key: 'footTrafficPerStoreDaily',
      header: '점포당 유동인구',
      align: 'right',
      // 그 동에 점포가 0 곳이면 나눌 수가 없다
      render: (row) => (
        <span className={cellClass(row, location.dongCode)}>
          {formatPeopleCountText(row.footTrafficPerStoreDaily)}
        </span>
      ),
    },
    {
      key: 'revenuePerStoreMonthly',
      header: '평균 매출 (월)',
      align: 'right',
      // 매출은 null 이 올 수 있다. formatWonText 가 '-' 를 만든다
      render: (row) => (
        <span className={cellClass(row, location.dongCode)}>
          {formatWonText(row.revenuePerStoreMonthly)}
        </span>
      ),
    },
    {
      key: 'annualCloseRate',
      header: '연 폐업률',
      align: 'right',
      render: (row) => (
        <span className={cellClass(row, location.dongCode)}>
          {formatPercentText(row.annualCloseRate)}
        </span>
      ),
    },
  ]

  return (
    <Panel
      title="주변 상권 비교"
      /*
        무슨 기준으로 뽑힌 목록인지 밝힌다. 지도에서 지표를 바꾸면 이 표의 행도 함께
        바뀌는데, 근거를 안 적으면 '왜 갑자기 다른 동이 나오지' 가 된다.
      */
      headerRight={
        <span className="text-text-muted text-caption">
          {HEAT_METRIC_SPEC[metric].label} 상위 {top.length}곳
        </span>
      }
    >
      <Table
        caption={`${location.districtName} 행정동별 동종업종 비교`}
        columns={columns}
        rows={rows}
        getRowId={(row) => row.rowKey}
        bordered={false}
        rowClassName={(row) =>
          cn(
            row.dongCode === location.dongCode && 'bg-primary-soft',
            /* 고정석과 순위표를 가르는 선. 굵기는 셀마다 cellClass 가 맡는다 */
            row.pinned && 'border-border-strong border-b-2',
          )
        }
      />
    </Panel>
  )
}
