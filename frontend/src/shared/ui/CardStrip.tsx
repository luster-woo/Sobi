import type { ReactNode } from 'react'
import { Children, useCallback, useRef, useState } from 'react'

import Panel from '@/shared/ui/Panel'
import { cn } from '@/shared/utils/cn'

interface CardStripProps {
  /** 스트립 제목. '지원 가능한 대출' */
  title: string
  /** 제목 옆 건수. 보이는 카드 수가 아니라 전체 건수다 */
  count?: number
  /**
   * ProductCard 들.
   *
   * 0건이면 이 컴포넌트를 그리지 말고 EmptyState 를 그린다. 건수·화살표·전체 보기
   * 버튼이 전부 의미가 없어지는데, 그것들만 남으면 헤더와 푸터 사이가 텅 비어
   * 고장난 화면처럼 보인다.
   */
  children: ReactNode
  /** 하단 전체 폭 버튼 자리. '대출 전체 보기' */
  footer?: ReactNode
  /** 카드 한 장의 폭(px) */
  itemWidth?: number
  className?: string
}

/** 아래 gap-[10px] 과 같은 값. 한 번에 몇 칸 넘길지 계산할 때 쓴다 */
const GAP = 10

/**
 * 양 끝 판정에 두는 여유(px).
 *
 * 브라우저가 스크롤 위치를 소수점으로 들고 있어서 끝까지 밀어도 1px 이 남는 경우가 있다.
 * 여유 없이 `=== 0` 으로 보면 화살표가 영영 꺼지지 않는다.
 */
const EDGE_TOLERANCE = 2

function Arrow({
  side,
  disabled,
  onClick,
}: {
  side: 'left' | 'right'
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === 'left' ? '이전' : '다음'}
      className={cn(
        'bg-surface grid size-[25px] shrink-0 place-items-center rounded-sm border transition-colors',
        disabled
          ? 'border-border-subtle text-text-disabled cursor-default'
          : 'border-border-strong text-text-secondary hover:text-text',
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={side === 'left' ? 'm15 5-7 7 7 7' : 'm9 5 7 7-7 7'} />
      </svg>
    </button>
  )
}

/**
 * 카드 가로 스트립 (시안의 .panel > .strip-head + .strip).
 *
 * 대시보드의 "지원 가능한 대출" 한 덩어리다. 제목·건수·화살표·카드 줄·전체 보기 버튼이
 * 한 패널 안에 들어간다. 카드 줄만 떼어내면 화살표가 헤더 우측에 붙지 못한다.
 *
 * 스크롤은 브라우저 네이티브(overflow-x-auto)에 맡기고 화살표는 그것을 조작하기만
 * 한다. 직접 transform 으로 옮기면 터치 스와이프·트랙패드 관성·스크롤바가 전부
 * 사라져서, 마우스 없는 환경에서 카드를 넘길 방법이 없어진다.
 *
 * 화살표는 숨기지 않고 disabled 로 둔다. 헤더 우측 고정 자리라서 사라지면 헤더 폭이
 * 흔들린다.
 */
export default function CardStrip({
  title,
  count,
  children,
  footer,
  itemWidth = 236,
  className,
}: CardStripProps) {
  const listRef = useRef<HTMLUListElement | null>(null)
  const [edge, setEdge] = useState({ start: true, end: true })

  const measure = useCallback((node: HTMLUListElement) => {
    const { scrollLeft, scrollWidth, clientWidth } = node
    setEdge({
      start: scrollLeft <= EDGE_TOLERANCE,
      end: scrollLeft + clientWidth >= scrollWidth - EDGE_TOLERANCE,
    })
  }, [])

  /**
   * ref 콜백에서 첫 측정과 ResizeObserver 등록을 같이 한다.
   * useEffect 안에서 setState 하면 set-state-in-effect 규칙에 걸린다.
   */
  const attach = useCallback(
    (node: HTMLUListElement | null) => {
      listRef.current = node
      if (!node) return

      measure(node)
      // 창 폭이 바뀌면 보이는 카드 수가 달라져 화살표 활성 여부도 달라진다
      const observer = new ResizeObserver(() => measure(node))
      observer.observe(node)
      return () => observer.disconnect()
    },
    [measure],
  )

  const scrollByPage = (direction: -1 | 1) => {
    const node = listRef.current
    if (!node) return

    // 보이는 만큼 넘기되 카드 단위로 딱 떨어지게 자른다. 반 장씩 걸치면 다음 장을
    // 눌렀을 때 방금 본 카드가 다시 반쯤 보인다
    const step = itemWidth + GAP
    const perPage = Math.max(1, Math.floor(node.clientWidth / step))
    node.scrollBy({ left: direction * perPage * step, behavior: 'smooth' })
  }

  return (
    <Panel className={className}>
      <div className="flex items-center justify-between gap-3 px-[15px] pt-2.5">
        <span className="flex min-w-0 items-baseline gap-2">
          <h3 className="text-text truncate text-[13.5px] font-bold">{title}</h3>
          {count !== undefined && (
            <span className="text-text-muted shrink-0 text-[11.5px] tabular-nums">{count}건</span>
          )}
        </span>

        <span className="flex shrink-0 gap-[5px]">
          <Arrow side="left" disabled={edge.start} onClick={() => scrollByPage(-1)} />
          <Arrow side="right" disabled={edge.end} onClick={() => scrollByPage(1)} />
        </span>
      </div>

      <div className="relative">
        {/* 오른쪽 끝을 흰색으로 흐리게 덮어 카드가 더 있다는 것을 알린다 */}
        <div
          aria-hidden="true"
          className="to-surface pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-r from-transparent to-[72%]"
        />

        <ul
          ref={attach}
          onScroll={(event) => measure(event.currentTarget)}
          aria-label={title}
          // 스크롤 영역은 키보드로도 닿아야 한다. 포커스 후 좌우 방향키로 넘어간다
          tabIndex={0}
          // 스크롤바를 숨긴다. 헤더에 화살표가 있어 역할이 겹치고, 윈도우 크롬은
          // 가로 스크롤바에 양쪽 화살표 버튼까지 그려서 카드보다 더 눈에 띈다
          //
          // scroll-px 는 px 와 같은 값이어야 한다. 스냅 기준선이 패딩 안쪽으로 오지
          // 않으면 브라우저가 첫 카드를 맞추려고 scrollLeft 를 패딩만큼 밀어버리고,
          // 맨 왼쪽인데도 scrollLeft 가 15 라서 왼쪽 화살표가 꺼지지 않는다
          className="focus-visible:outline-primary flex snap-x snap-mandatory scroll-px-[15px] [scrollbar-width:none] items-stretch gap-[10px] overflow-x-auto px-[15px] py-2.5 focus-visible:outline focus-visible:-outline-offset-2 [&::-webkit-scrollbar]:hidden"
        >
          {Children.map(children, (child) => (
            // 폭은 카드가 아니라 여기서 정한다 (ProductCard 주석 참고)
            <li className="snap-start" style={{ flex: `0 0 ${itemWidth}px` }}>
              {child}
            </li>
          ))}
        </ul>
      </div>

      {footer && <div className="px-[15px] pb-3">{footer}</div>}
    </Panel>
  )
}
