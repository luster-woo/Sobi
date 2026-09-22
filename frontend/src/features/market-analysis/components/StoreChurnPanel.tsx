import MiniPanel from '@/features/market-analysis/components/MiniPanel'
import { formatPercentText } from '@/features/market-analysis/model/format'
import type { MarketAnalysis } from '@/features/market-analysis/model/types'
import Badge from '@/shared/ui/Badge'
import { cn } from '@/shared/utils/cn'

interface StoreChurnPanelProps {
  business: MarketAnalysis['business']
  storeChurn: MarketAnalysis['storeChurn']
}

function Stat({
  value,
  label,
  tone = 'normal',
}: {
  value: string
  label: string
  tone?: 'normal' | 'danger' | 'primary'
}) {
  return (
    <div className="text-center">
      <p
        className={cn(
          'text-[19px] leading-none font-bold tracking-tight tabular-nums',
          tone === 'danger' ? 'text-danger' : tone === 'primary' ? 'text-primary' : 'text-text',
        )}
      >
        {value}
      </p>
      <p className="text-text-muted text-caption mt-1.5">{label}</p>
    </div>
  )
}

/**
 * 점포 변동 — 개업·폐업.
 *
 * 시안에 없던 패널이다. storeChurn 에서 annualCloseRate 하나만 상단 타일에 쓰고 나머지
 * (개업 수·폐업 수·순증감·개업률·서울 평균 폐업률)를 버리고 있어서 더했다.
 *
 * 예비창업자에게는 이 패널이 매출보다 중요할 수 있다. 매출이 높아도 점포가 계속
 * 바뀌는 상권이면 그 매출을 내가 가져간다는 뜻이 아니다. 그래서 순증감이 음수일 때
 * 경고 배지와 함께 "자리가 나는 이유를 확인하라" 는 문장을 붙인다.
 *
 * ⚠️ opened·closed 의 집계 기간을 '최근 1년' 으로 가정했다. annualCloseRate 와 함께
 *    오므로 연간으로 보이는데 명세에 기간이 적혀 있지 않다. 백엔드 확인 대기.
 */
export default function StoreChurnPanel({ business, storeChurn }: StoreChurnPanelProps) {
  const shrinking = storeChurn.net < 0

  const { annualOpenRate, annualCloseRate, seoulAvgCloseRate } = storeChurn
  /*
   * 폐업률을 서울 평균과 견주는 문장이라 둘 다 있어야 성립한다. 하나라도 없으면
   * 비교를 빼고 안내 문장으로 바꾼다 — 숫자가 없는데 '높습니다' 라고 쓸 수 없다.
   */
  const closeGap =
    annualCloseRate !== null && seoulAvgCloseRate !== null
      ? Math.round((annualCloseRate - seoulAvgCloseRate) * 10) / 10
      : null

  return (
    <MiniPanel
      title="점포 변동 — 최근 1년"
      headerRight={
        <Badge variant={shrinking ? 'warning' : 'success'}>{shrinking ? '순감소' : '순증가'}</Badge>
      }
    >
      <div className="grid grid-cols-3 gap-2 py-1">
        <Stat value={storeChurn.opened.toLocaleString('ko-KR')} label="개업" />
        <Stat value={storeChurn.closed.toLocaleString('ko-KR')} label="폐업" />
        <Stat
          // 증가는 부호를 붙여 감소와 대비시킨다. 0 은 부호 없이 그대로 둔다
          value={storeChurn.net > 0 ? `+${storeChurn.net}` : String(storeChurn.net)}
          label="순증감"
          tone={shrinking ? 'danger' : storeChurn.net > 0 ? 'primary' : 'normal'}
        />
      </div>

      <p className="text-text-secondary text-caption leading-relaxed">
        {closeGap === null ? (
          '이 상권은 동종업종 점포가 집계되지 않아 개업·폐업률을 계산할 수 없어요.'
        ) : (
          <>
            연간 개업률 {formatPercentText(annualOpenRate)} · 폐업률{' '}
            {formatPercentText(annualCloseRate)} — 서울시 {business.name} 평균 폐업률{' '}
            {formatPercentText(seoulAvgCloseRate)} 보다 {Math.abs(closeGap).toFixed(1)}%p{' '}
            {closeGap >= 0 ? '높습니다' : '낮습니다'}.
          </>
        )}
        {shrinking && ' 점포가 순감소 중인 상권이라 자리가 나는 이유를 확인해보세요.'}
      </p>
    </MiniPanel>
  )
}
