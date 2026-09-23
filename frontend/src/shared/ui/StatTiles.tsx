import { cn } from '@/shared/utils/cn'

export interface StatTile {
  label: string
  /** 포맷팅이 끝난 숫자. '868' · '19.2' · '2,501' · 값이 없으면 '-' */
  value: string
  /** 숫자 뒤에 작게 붙는 단위. '곳' · '만 명' · '만 원' */
  unit?: string
}

interface StatTilesProps {
  items: StatTile[]
  /** 한 줄에 몇 칸. 기본 4 */
  columns?: 3 | 4
  className?: string
}

/**
 * 시안의 .tiles — 숫자 몇 개를 한 줄에 나란히 보여주는 칸.
 *
 * 칸 사이 선을 각 칸의 border 로 만들지 않는다. gap 1px 에 컨테이너 배경을 선 색으로
 * 두고 칸을 흰색으로 덮는 방식인데, 그래야 가운데 선이 2px 로 겹치지 않고 모서리
 * 라운드도 컨테이너 하나로 처리된다.
 *
 * 값이 없을 때(서버가 null 을 줄 때) 판단은 부르는 쪽이 한다. 여기서 '-' 를 만들면
 * "0 곳" 과 "데이터 없음" 을 구분할 수 없다.
 */
export default function StatTiles({ items, columns = 4, className }: StatTilesProps) {
  return (
    <dl
      className={cn(
        'bg-border border-border grid gap-px overflow-hidden rounded-md border',
        columns === 4 ? 'grid-cols-4' : 'grid-cols-3',
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="bg-surface px-3.5 py-3">
          <dt className="text-text-muted text-caption">{item.label}</dt>
          <dd className="text-text mt-[3px] text-[19px] font-bold tracking-tight tabular-nums">
            {item.value}
            {item.unit && (
              <small className="text-text-secondary text-caption font-normal">{item.unit}</small>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}
