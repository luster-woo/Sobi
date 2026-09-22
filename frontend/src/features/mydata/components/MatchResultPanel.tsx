import type { MydataLinkResult } from '@/features/mydata/model/types'
import { useAnimatedNumber } from '@/shared/hooks/useAnimatedNumber'
import { cn } from '@/shared/utils/cn'

/** 막대가 드러나는 animate-reveal-bar 와 같은 길이. 숫자와 막대가 같이 멈춘다 */
const COUNT_DURATION_MS = 700

interface Segment {
  key: string
  label: string
  count: number
  colorClass: string
}

function toSegments(result: MydataLinkResult): Segment[] {
  return [
    {
      key: 'eligible',
      label: '신청 가능',
      count: result.eligibleCount,
      colorClass: 'bg-success',
    },
    {
      key: 'unknown',
      label: '확인 필요',
      count: result.unknownCount,
      colorClass: 'bg-warning',
    },
    {
      key: 'ineligible',
      label: '신청 불가',
      count: result.ineligibleCount,
      colorClass: 'bg-danger',
    },
  ]
}

function CountTile({ segment }: { segment: Segment }) {
  const value = useAnimatedNumber(segment.count, { durationMs: COUNT_DURATION_MS })

  return (
    <div className="bg-surface px-3.5 py-3">
      <dt className="text-caption text-text-muted flex items-center gap-1.5">
        <span aria-hidden="true" className={cn('size-2 rounded-full', segment.colorClass)} />
        {segment.label}
      </dt>
      <dd className="text-text mt-[3px] text-[22px] font-bold tracking-tight tabular-nums">
        {Math.round(value)}
        <small className="text-text-secondary text-caption font-normal">개</small>
      </dd>
    </div>
  )
}

/**
 * 자격 판정 결과. 판정 화면의 진행이 끝나면 이 패널로 바뀐다.
 *
 * 막대는 세 구간의 비율이다. 왼쪽부터 드러나며 숫자와 같이 채워진다.
 */
export default function MatchResultPanel({ result }: { result: MydataLinkResult }) {
  const segments = toSegments(result)
  const total = Math.max(result.totalCount, 1)

  return (
    <div className="border-border bg-surface animate-fade-slide-in w-full overflow-hidden rounded-md border">
      <div className="border-border-subtle border-b px-4 py-3.5">
        <p className="text-body2 text-text mb-2.5">지원사업 {result.totalCount}개 판정 완료</p>
        <div
          role="img"
          aria-label={segments.map((s) => `${s.label} ${s.count}개`).join(', ')}
          className="bg-border-subtle animate-reveal-bar flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full"
        >
          {segments.map((segment) =>
            segment.count > 0 ? (
              <span
                key={segment.key}
                className={cn('h-full', segment.colorClass)}
                style={{ width: `${(segment.count / total) * 100}%` }}
              />
            ) : null,
          )}
        </div>
      </div>

      <dl className="bg-border grid grid-cols-3 gap-px">
        {segments.map((segment) => (
          <CountTile key={segment.key} segment={segment} />
        ))}
      </dl>
    </div>
  )
}
