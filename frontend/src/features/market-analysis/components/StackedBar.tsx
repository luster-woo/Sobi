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

/**
 * 100% 를 둘로 나눠 채우는 막대. 조각 안에 비율을 적는다.
 *
 * ComparisonBar 와 나눈 이유는 읽는 방식이 다르기 때문이다. ComparisonBar 는 여러 줄을
 * 쌓아 길이를 서로 견주는 것이고, 이건 한 줄 안에서 두 값이 100% 를 나눠 갖는 관계를
 * 보여준다. 주중·주말이나 남·여처럼 합이 정해진 값에 쓴다.
 *
 * 조각이 아주 작으면(10% 미만) 안쪽 문구가 잘린다. 요일·성별 비중은 보통 30:70 안쪽에
 * 들어와서 그대로 뒀다. 잘리는 데이터가 나오면 문구를 막대 밖으로 빼야 한다.
 */
export default function StackedBar({ segments, className }: StackedBarProps) {
  return (
    <div className={cn('flex h-8 overflow-hidden rounded-md', className)}>
      {segments.map((segment, index) => (
        <div
          key={segment.label}
          style={{ width: `${Math.max(0, Math.min(100, segment.percent))}%` }}
          className={cn(
            'flex items-center justify-center text-[12px] font-medium whitespace-nowrap',
            index === 0 ? 'bg-primary text-text-inverse' : 'bg-bg-canvas text-text-secondary',
          )}
        >
          {segment.label}
        </div>
      ))}
    </div>
  )
}
