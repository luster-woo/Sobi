import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '@/utils/format'

import { IconChevronRight } from './Icon'

interface CardCarouselProps {
  items: ReactNode[]
  /** 한 화면에 보일 카드 수 */
  perView?: number
  /** 카드 사이 간격(px) — Tailwind gap-4 와 맞춤 */
  gap?: number
}

function Arrow({ dir, onClick }: { dir: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={dir === 'left' ? '이전 상품' : '다음 상품'}
      onClick={onClick}
      className={cn(
        'border-border bg-surface text-text-secondary shadow-card hover:bg-surface-muted absolute top-1/2 z-10 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full border transition-colors',
        dir === 'left' ? '-left-3' : '-right-3',
      )}
    >
      <IconChevronRight size={16} className={dir === 'left' ? 'rotate-180' : undefined} />
    </button>
  )
}

/**
 * 가로 스크롤 카드 목록.
 * 카드가 화면 수보다 많으면 좌우 화살표가 나타나고, 트랙을 직접 밀어서도 볼 수 있다.
 */
export default function CardCarousel({ items, perView = 3, gap = 16 }: CardCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(true)

  const sync = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setAtStart(el.scrollLeft <= 1)
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1)
  }, [])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => ro.disconnect()
  }, [sync, items.length])

  const scroll = (dir: -1 | 1) => {
    const el = trackRef.current
    if (!el) return
    const step = (el.clientWidth - gap * (perView - 1)) / perView + gap
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={sync}
        className="flex snap-x snap-mandatory [scrollbar-width:none] items-stretch gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => (
          <div
            key={i}
            className="snap-start"
            style={{ flex: `0 0 calc((100% - ${gap * (perView - 1)}px) / ${perView})` }}
          >
            {item}
          </div>
        ))}
      </div>

      {!atStart && <Arrow dir="left" onClick={() => scroll(-1)} />}
      {!atEnd && <Arrow dir="right" onClick={() => scroll(1)} />}
    </div>
  )
}
