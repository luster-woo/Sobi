import type { FundingCombination } from '@/features/funding-plan/model/types'
import Panel from '@/shared/ui/Panel'
import type { Column } from '@/shared/ui/Table'
import Table from '@/shared/ui/Table'
import { formatMoneyShort } from '@/shared/utils/formatters'

interface FundingComparisonTableProps {
  combinations: FundingCombination[]
  /** 대표로 고른 조합의 인덱스. 그 행을 강조한다 */
  selectedIndex: number
  onSelect: (index: number) => void
}

/** 표에 넣을 행. 인덱스를 같이 들고 있어야 '조합 1' 라벨과 강조를 만들 수 있다 */
interface Row {
  index: number
  combination: FundingCombination
}

/**
 * 조합 비교.
 *
 * 조합이 두세 개뿐이라 정렬·필터를 두지 않았다. 전부 한 화면에 보이고, 숫자를 나란히
 * 놓는 것이 이 표의 목적이다.
 *
 * 행을 누르면 그 조합이 위 대표 카드로 올라간다. 표에서 숫자를 비교하고 마음에 드는
 * 것을 눌러 구성을 자세히 보는 흐름이다.
 *
 * 총 조달액 대신 총 상환액을 놓는다. 서버가 목표 금액을 정확히 맞춰 배분하므로
 * 총 조달액은 모든 행이 같은 값이다 — 비교표에서 자리만 차지한다.
 *
 * 총 상환액은 서버의 정렬 1순위이기도 하다(FundingRecommendationEngine 의 COMPARATOR).
 * 그 값을 안 보여주면 사용자는 왜 이 순서인지 알 수 없다. 평균 금리가 더 높은 조합이
 * 위에 오는 일이 실제로 생긴다.
 */
export default function FundingComparisonTable({
  combinations,
  selectedIndex,
  onSelect,
}: FundingComparisonTableProps) {
  const rows: Row[] = combinations.map((combination, index) => ({ index, combination }))

  const columns: Column<Row>[] = [
    {
      key: 'order',
      header: '조합',
      width: '90px',
      render: (row) => `조합 ${row.index + 1}`,
    },
    {
      key: 'composition',
      header: '구성',
      render: (row) =>
        row.combination.items
          .map((item) => `${item.name} ${formatMoneyShort(item.allocatedAmount)}`)
          .join(' + '),
    },
    {
      key: 'repayment',
      header: '총 상환액',
      align: 'right',
      width: '130px',
      render: (row) => formatMoneyShort(row.combination.totalRepaymentAmount),
    },
    {
      key: 'rate',
      header: '평균 금리',
      align: 'right',
      width: '110px',
      render: (row) => `연 ${row.combination.averageInterestRate}%`,
    },
    {
      key: 'monthly',
      header: '월 상환액',
      align: 'right',
      width: '120px',
      render: (row) => formatMoneyShort(row.combination.monthlyRepaymentAmount),
    },
    {
      key: 'interest',
      header: '총 이자',
      align: 'right',
      width: '120px',
      render: (row) => formatMoneyShort(row.combination.totalInterest),
    },
  ]

  return (
    <Panel
      title="조합 비교"
      headerRight={<span className="text-text-muted text-[11.5px]">총 상환액이 적은 순</span>}
    >
      <Table
        caption="자금 조합 비교"
        columns={columns}
        rows={rows}
        getRowId={(row) => row.index}
        bordered={false}
        onRowClick={(row) => onSelect(row.index)}
        rowClassName={(row) =>
          row.index === selectedIndex ? 'bg-primary-soft font-medium' : undefined
        }
      />
    </Panel>
  )
}
