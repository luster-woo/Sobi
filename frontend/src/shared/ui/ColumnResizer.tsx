import { type KeyboardEvent, type PointerEvent, useRef, useState } from 'react'

import { cn } from '@/shared/utils/cn'

interface ColumnResizerProps {
  /** 지금 칸 너비(px) */
  width: number
  onChange: (width: number) => void
  min: number
  max: number
  /** 두 칸 사이 간격(px). 손잡이를 그 한가운데 세운다 */
  gap: number
  /**
   * 재는 칸이 어느 쪽에 붙어 있는지.
   * 'left' 면 오른쪽으로 끌수록 넓어지고, 'right' 면 왼쪽으로 끌수록 넓어진다.
   */
  anchor?: 'left' | 'right'
  /** 스크린리더가 읽을 이름. '보조 열 너비' 처럼 */
  label: string
  className?: string
}

/** 잡을 수 있는 폭. 선은 2px 지만 그대로 두면 겨냥하기 어려워 양옆으로 넓힌다 */
const HIT_WIDTH = 11
/** 방향키 한 번에 움직이는 양 */
const KEY_STEP = 12

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/**
 * 칸 너비 조절 손잡이 — 노션 표의 열 경계와 같은 것.
 *
 * 평소에는 보이지 않다가 경계에 마우스를 가져가면 세로선이 뜬다. 항상 선을 그려두면
 * 읽는 화면에 조작용 선이 하나 더 생겨서, 내용을 나누는 구분선인지 손잡이인지 헷갈린다.
 *
 * 너비는 여기서 들고 있지 않고 부모가 갖는다. 그 값으로 grid-template-columns 를
 * 만들어야 해서, 칸을 실제로 그리는 쪽에 있어야 한다.
 *
 * 부모에 position 이 있어야 한다 — absolute inset-y-0 로 칸 높이만큼 늘어난다.
 *
 * 드래그는 setPointerCapture 로 잡는다. window 에 리스너를 붙였다 떼는 방식과 달리
 * 포인터가 요소 밖으로 나가도 이벤트가 계속 여기로 와서, 빠르게 휘둘러도 놓치지 않는다.
 * 끄는 동안에는 화면 전체를 덮는 투명 판을 하나 띄운다 — 커서를 col-resize 로 유지하고
 * 지나가는 글자가 선택되는 걸 막는 용도다.
 */
export default function ColumnResizer({
  width,
  onChange,
  min,
  max,
  gap,
  anchor = 'left',
  label,
  className,
}: ColumnResizerProps) {
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  /* 오른쪽에 붙은 칸은 손이 왼쪽으로 갈 때 넓어진다 */
  const direction = anchor === 'left' ? 1 : -1
  const offset = width + gap / 2 - HIT_WIDTH / 2

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // 누르는 순간 지나가는 글자가 선택되기 시작하는 걸 막는다
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { startX: event.clientX, startWidth: width }
    setDragging(true)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return

    /*
     * 지금 너비가 아니라 누른 지점에서 얼마나 움직였는지로 계산한다. 매 프레임 이전
     * 너비에 이동량을 더하면, 한계에 걸린 뒤 손을 되돌려도 칸이 바로 따라오지 않고
     * 밀어낸 만큼 헛돈다.
     */
    onChange(clamp(drag.startWidth + (event.clientX - drag.startX) * direction, min, max))
  }

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return

    dragRef.current = null
    setDragging(false)
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowLeft' ? -KEY_STEP : event.key === 'ArrowRight' ? KEY_STEP : 0
    if (step === 0) return

    event.preventDefault()
    onChange(clamp(width + step * direction, min, max))
  }

  return (
    <>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={label}
        aria-valuenow={Math.round(width)}
        aria-valuemin={min}
        aria-valuemax={max}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={handleKeyDown}
        className={cn(
          'group absolute inset-y-0 z-20 flex cursor-col-resize touch-none justify-center focus:outline-none',
          className,
        )}
        // 경계 한가운데에서 잡는 폭의 절반만큼 물러난 자리가 손잡이의 시작이다
        style={
          anchor === 'left'
            ? { width: HIT_WIDTH, left: offset }
            : { width: HIT_WIDTH, right: offset }
        }
      >
        <span
          aria-hidden="true"
          className={cn(
            'bg-primary h-full w-[2px] rounded-full transition-opacity',
            // 끄는 중에는 손이 선을 벗어나도 계속 보여야 한다
            dragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus:opacity-100',
          )}
        />
      </div>

      {dragging && <div className="fixed inset-0 z-50 cursor-col-resize" />}
    </>
  )
}
