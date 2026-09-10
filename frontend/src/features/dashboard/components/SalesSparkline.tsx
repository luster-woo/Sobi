import { toManwon, toMonthLabel } from '@/features/dashboard/model/format'
import type { SalesPoint } from '@/features/dashboard/model/types'
import { cn } from '@/shared/utils/cn'

/** 가장 높은 막대의 높이(px). 아래 월 표시까지 더해 카드가 62px 정도를 쓴다 */
const MAX_BAR = 46
/** 가장 낮은 막대의 높이(px). 0 으로 두면 그 달이 매출 0 처럼 보인다 */
const MIN_BAR = 14

/**
 * 0 이 아니라 최저 매출을 바닥으로 잡는다.
 *
 * 6개월 매출은 2,180만~3,240만처럼 폭이 좁다. 0 을 바닥으로 그리면 막대 높이가 전부
 * 비슷해져서 오르는지 내리는지가 안 보인다 — 이 그림이 있는 이유가 사라진다.
 *
 * ⚠️ 그래서 막대 높이의 비율은 금액의 비율이 아니다. 아래에 최저·최고 금액을 같이
 *    적는 것으로 보완한다.
 */
function barHeight(amount: number, min: number, max: number) {
  if (max <= min) return MAX_BAR
  return MIN_BAR + ((amount - min) / (max - min)) * (MAX_BAR - MIN_BAR)
}

interface SalesSparklineProps {
  points: SalesPoint[]
}

/**
 * 최근 6개월 매출 막대 (시안의 .spark).
 *
 * 축도 격자도 없다. 여기서 읽을 것은 금액이 아니라 오르는지 내리는지이고, 정확한
 * 금액은 아래위 눈금 두 개(최저·최고)로 범위만 알려준다. 차트 라이브러리를 넣지 않은
 * 이유도 같다 — 툴팁·축·범례가 필요하면 상권 분석 화면의 차트를 쓸 자리다.
 *
 * 마지막 달만 진하다. 6개 막대가 같은 색이면 어느 쪽이 최근인지 알 수 없고, 왼쪽부터
 * 시간순이라는 것을 아는 사람만 읽을 수 있다.
 */
export default function SalesSparkline({ points }: SalesSparklineProps) {
  if (points.length === 0) return null

  const amounts = points.map((point) => point.amount)
  const max = Math.max(...amounts)
  const min = Math.min(...amounts)

  return (
    <div>
      <p className="text-text-muted mb-[5px] text-[11px]">최근 {points.length}개월 매출</p>

      <div className="flex items-end gap-[5px]">
        {points.map((point, index) => (
          <div key={point.month} className="flex flex-1 flex-col items-center gap-[3px]">
            <span
              aria-hidden="true"
              className={cn(
                'w-full rounded-t-[2px]',
                // 토큰에 막대용 회색이 없다. 배경(bg-canvas)과 흐린 글자색을 빌려 쓴다
                index === points.length - 1 ? 'bg-text-disabled' : 'bg-bg-canvas',
              )}
              style={{ height: barHeight(point.amount, min, max) }}
            />
            <span className="text-text-muted text-[9px] tabular-nums">
              {toMonthLabel(point.month)}
            </span>
          </div>
        ))}
      </div>

      {/* 막대에 값을 붙이지 않는 대신 범위를 적는다. 6개 다 적으면 9px 글자가 겹친다 */}
      <p className="text-text-muted flex justify-between text-[10px] tabular-nums">
        <span>{toManwon(min).value}만</span>
        <span>{toManwon(max).value}만</span>
      </p>
    </div>
  )
}
