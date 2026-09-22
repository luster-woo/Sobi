import { useAnimatedNumber } from '@/shared/hooks/useAnimatedNumber'
import { cn } from '@/shared/utils/cn'

export interface StackedBarSegment {
  /** 막대 안에 들어갈 문구. '주중 65%' */
  label: string
  /** 0~100 */
  percent: number
}

interface StackedBarProps {
  /** 두 조각을 넘긴다. 앞쪽이 강조색(primary), 뒤쪽이 중립색 */
  segments: [StackedBarSegment, StackedBarSegment]
  className?: string
}

/** 처음 그릴 때 경계가 출발하는 자리. 반반에서 제 비율을 찾아간다 */
const NEUTRAL_PERCENT = 50

/**
 * 100% 를 둘로 나눠 채우는 막대. 조각 안에 비율을 적는다.
 *
 * ComparisonBar 와 나눈 이유는 읽는 방식이 다르기 때문이다. ComparisonBar 는 여러 줄을
 * 쌓아 길이를 서로 견주는 것이고, 이건 한 줄 안에서 두 값이 100% 를 나눠 갖는 관계를
 * 보여준다. 주중·주말이나 남·여처럼 합이 정해진 값에 쓴다.
 *
 * 움직이는 것은 **가운데 경계뿐**이다. 막대 전체 길이는 언제나 100% 로 고정이다.
 * 전체가 왼쪽부터 드러나는 연출을 먼저 썼다가 걷어냈다 — 합이 정해진 값인데 전체가
 * 자라면 '총량이 늘어난다' 로 읽혀서, 이 막대가 말하려는 관계와 어긋난다.
 *
 * 조각이 아주 작으면(10% 미만) 안쪽 문구가 잘린다. 요일·성별 비중은 보통 30:70 안쪽에
 * 들어와서 그대로 뒀다. 잘리는 데이터가 나오면 문구를 막대 밖으로 빼야 한다.
 */
export default function StackedBar({ segments, className }: StackedBarProps) {
  const [first, second] = segments

  /*
   * 앞 조각의 너비만 보간하고 뒤 조각은 flex-1 로 나머지를 먹인다.
   *
   * 둘 다 퍼센트로 주면 보간 중간값이 반올림되면서 합이 99 나 101 이 되는 순간이 생겨
   * 막대 끝이 미세하게 들썩인다. 한쪽만 움직이면 그 틈이 생길 자리가 없다.
   *
   * 처음에는 반반에서 출발하고, 그 다음부터는 화면에 떠 있던 비율에서 새 비율로 간다.
   * 상권을 바꿔 가며 비교하는 화면이라 경계가 어느 쪽으로 움직였는지가 곧 정보다.
   */
  const firstPercent = useAnimatedNumber(clampPercent(first.percent), { from: NEUTRAL_PERCENT })

  return (
    <div className={cn('flex h-8 overflow-hidden rounded-md', className)}>
      <div
        style={{ width: `${firstPercent}%` }}
        className="bg-primary text-text-inverse text-caption flex items-center justify-center font-medium whitespace-nowrap"
      >
        {first.label}
      </div>

      <div className="bg-bg-canvas text-text-secondary text-caption flex flex-1 items-center justify-center font-medium whitespace-nowrap">
        {second.label}
      </div>
    </div>
  )
}

/** 서버가 범위를 벗어난 값을 줘도 경계가 막대 밖으로 나가지 않게 */
function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value))
}
