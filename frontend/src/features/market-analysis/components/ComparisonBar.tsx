import { cn } from '@/shared/utils/cn'

interface ComparisonBarProps {
  /** 왼쪽 이름. '마포구 평균' · '서교동' · '한식음식점' */
  label: string
  /** 오른쪽 값. 포맷이 끝난 문자열. '868곳' · '27곳·31%' */
  value: string
  /** 막대 길이 비율. 0~1 */
  ratio: number
  /** 조회 대상 본인 줄이면 true. 초록으로 채운다 */
  highlight?: boolean
  /** 이름 칸 너비(px). 항목 이름이 길면 늘린다 */
  labelWidth?: number
  /** 값 칸 너비(px) */
  valueWidth?: number
}

/**
 * 시안의 .cmp — 이름 / 막대 / 값 한 줄.
 *
 * 막대 길이는 비율을 밖에서 계산해 넘긴다. 여기서 계산하려면 비교 대상 전체를 알아야
 * 하는데, 밀집도 패널은 세 값의 최댓값 기준이고 업종 구성은 100% 기준이라 기준이 다르다.
 *
 * 이름·값 칸 너비를 고정하는 이유는 여러 줄을 쌓았을 때 막대 시작·끝이 세로로
 * 맞아야 길이를 눈으로 비교할 수 있기 때문이다.
 */
export default function ComparisonBar({
  label,
  value,
  ratio,
  highlight = false,
  labelWidth = 54,
  valueWidth = 44,
}: ComparisonBarProps) {
  const percent = Math.max(0, Math.min(1, ratio)) * 100

  return (
    <div className="flex items-center gap-2.5 text-[12px]">
      <span className="text-text-secondary shrink-0 truncate" style={{ width: labelWidth }}>
        {label}
      </span>

      <span className="bg-surface-muted h-2.5 flex-1 overflow-hidden rounded-[2px]">
        {/* 최종 너비는 style 이 정하고, 애니메이션은 0 → 1 배율만 움직인다 */}
        <span
          className={cn('animate-grow-bar block h-full', highlight ? 'bg-primary' : 'bg-[#cfd6d3]')}
          style={{ width: `${percent}%` }}
        />
      </span>

      <span className="text-text shrink-0 text-right tabular-nums" style={{ width: valueWidth }}>
        {value}
      </span>
    </div>
  )
}
