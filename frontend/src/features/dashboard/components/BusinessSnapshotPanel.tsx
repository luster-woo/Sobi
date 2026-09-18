import MiniKeyValues, { type KeyValueItem } from '@/features/dashboard/components/MiniKeyValues'
import MiniPanel from '@/features/dashboard/components/MiniPanel'
import SalesSparkline from '@/features/dashboard/components/SalesSparkline'
import { toDotDate, toManwon, toSignedPercent } from '@/features/dashboard/model/format'
import type { BusinessSnapshot } from '@/features/dashboard/model/types'
import Badge from '@/shared/ui/Badge'

interface BusinessSnapshotPanelProps {
  snapshot: BusinessSnapshot
}

function toRateItem(label: string, rate: number | null): KeyValueItem[] {
  if (rate === null) return []
  return [{ label, value: toSignedPercent(rate), tone: rate > 0 ? 'primary' : 'default' }]
}

/**
 * 마이데이터로 가져온 내 사업장 숫자.
 *
 * 자격 판정의 근거가 되는 값들이다. 판정 결과만 보여주면 왜 18건인지 알 수 없어서,
 * 판정에 쓰인 매출·현금흐름·대출 잔액을 같은 화면에 둔다.
 *
 * 증감률에 부호를 문자로 넣는다(+8%). 색으로만 좋고 나쁨을 구분하면 색을 구분하지
 * 못하는 사용자에게는 그냥 숫자 8이다.
 */
export default function BusinessSnapshotPanel({ snapshot }: BusinessSnapshotPanelProps) {
  const sales = toManwon(snapshot.monthlySales)
  const balance = toManwon(snapshot.totalLoanBalance)

  const items: KeyValueItem[] = [
    { label: '최근 월 매출', value: sales.value, unit: sales.unit },
    ...toRateItem('전월 대비', snapshot.salesChangeRate),
    ...toRateItem('현금 흐름', snapshot.cashFlowChangeRate),
    { label: '총 대출 잔액', value: balance.value, unit: balance.unit },
  ]

  return (
    <MiniPanel
      label={
        snapshot.updatedAt ? `마이데이터 · ${toDotDate(snapshot.updatedAt)} 갱신` : '마이데이터'
      }
      title="내 사업장 정보"
      aside={
        snapshot.isLinking ? (
          <Badge variant="progress">갱신 중</Badge>
        ) : (
          <Badge variant="success">연동 완료</Badge>
        )
      }
      note={snapshot.summary}
    >
      <MiniKeyValues items={items} />
      <SalesSparkline points={snapshot.recentSales} />
    </MiniPanel>
  )
}
