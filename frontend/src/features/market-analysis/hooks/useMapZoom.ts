import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from 'react'

/** 축소 한계. 1 이면 지도 전체가 화면에 들어온다 */
const MIN_ZOOM = 1
/** 확대 한계. 좁은 동의 이름표가 들어갈 만큼이면 충분하고, 더 키우면 길을 잃는다 */
const MAX_ZOOM = 3
/** 휠 한 칸에 곱해지는 값 */
const ZOOM_STEP = 1.15
/**
 * 끌었다고 볼 최소 거리(px).
 *
 * 이 아래는 클릭으로 친다. 지도를 눌러 다른 상권으로 가는 동작과 끌어서 옮기는 동작이
 * 같은 마우스 버튼을 쓰기 때문에, 손이 조금 흔들렸다고 클릭이 씹히면 안 된다.
 */
const DRAG_THRESHOLD = 4

interface Viewport {
  x: number
  y: number
  zoom: number
}

interface UseMapZoomOptions {
  /** 원래 크기(viewBox 기준) */
  width: number
  height: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * SVG 지도의 확대·축소와 이동.
 *
 * viewBox 를 직접 옮긴다. 라이브러리도, transform 도 쓰지 않는다 — viewBox 를 줄이면
 * 선 두께와 글자까지 같이 커지는데, 그 배율을 컴포넌트가 알아야 글자 크기를 되돌려
 * 화면에서 일정하게 유지할 수 있다. transform 으로 감싸면 그 값이 CSS 안으로 숨는다.
 *
 * 휠은 커서 아래 지점을 붙잡고 확대한다. 화면 한가운데를 기준으로 키우면 보려던 동이
 * 옆으로 밀려나 매번 다시 찾아야 한다.
 *
 * wheel 을 addEventListener 로 다는 이유는 React 의 onWheel 이 passive 라서다.
 * passive 리스너에서는 preventDefault 가 막혀, 지도를 확대하는 동안 페이지도 같이
 * 스크롤된다.
 */
export function useMapZoom({ width, height }: UseMapZoomOptions) {
  /*
   * SVG 를 ref 가 아니라 state 로 받는다.
   *
   * useRef 로 받으면 리스너가 영원히 안 붙는다. 이 패널은 경계 파일을 받는 동안
   * 스켈레톤만 그리는데, 그때 SVG 가 없어 effect 가 ref.current === null 을 보고
   * 그냥 돌아간다. 뒤늦게 SVG 가 생겨도 ref 는 값이 바뀌어도 리렌더를 일으키지 않아
   * effect 가 다시 돌 계기가 없다.
   *
   * 콜백 ref 로 받으면 DOM 이 붙는 순간 state 가 바뀌고, 그때 effect 가 다시 돌아
   * 리스너를 건다.
   */
  const [svg, setSvg] = useState<SVGSVGElement | null>(null)
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: MIN_ZOOM })

  /** 확대한 만큼 볼 수 있는 범위가 줄어든다. 그 밖으로 나가지 않게 가둔다 */
  const clampViewport = useCallback(
    (x: number, y: number, zoom: number): Viewport => ({
      x: clamp(x, 0, width - width / zoom),
      y: clamp(y, 0, height - height / zoom),
      zoom,
    }),
    [width, height],
  )

  useEffect(() => {
    if (!svg) return

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()

      const { x, y, zoom } = viewport
      const nextZoom = clamp(
        zoom * (event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP),
        MIN_ZOOM,
        MAX_ZOOM,
      )

      if (nextZoom === zoom) return

      /* 커서가 가리키던 지점이 확대 뒤에도 같은 자리에 있도록 시작점을 옮긴다 */
      const rect = svg.getBoundingClientRect()
      const pointerX = x + ((event.clientX - rect.left) / rect.width) * (width / zoom)
      const pointerY = y + ((event.clientY - rect.top) / rect.height) * (height / zoom)

      setViewport(
        clampViewport(
          pointerX - (pointerX - x) * (zoom / nextZoom),
          pointerY - (pointerY - y) * (zoom / nextZoom),
          nextZoom,
        ),
      )
    }

    svg.addEventListener('wheel', handleWheel, { passive: false })
    return () => svg.removeEventListener('wheel', handleWheel)
    /*
     * viewport 가 바뀔 때마다 리스너를 다시 단다. 최신 값을 ref 로 들고 있으면 등록은
     * 한 번으로 끝나지만, 그 ref 를 렌더 중에 갱신해야 해서 규칙에 걸린다
     * (react-hooks/refs). 리스너 교체는 휠 한 번에 한 번이라 값이 싸다.
     */
  }, [svg, viewport, width, height, clampViewport])

  /* 끌기. 눌린 지점과 그때의 시작점을 기억했다가 차이만큼 되민다 */
  const drag = useRef<{ clientX: number; clientY: number; x: number; y: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  /** 이번 눌림이 끌기였는가. 클릭을 삼킬지 판단한다 */
  const draggedRef = useRef(false)
  /** 포인터를 붙잡았는가. 붙잡는 순간 클릭이 SVG 로만 가므로 필요할 때만 건다 */
  const capturedRef = useRef(false)

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    /* 전체가 보이는 상태에서는 옮길 것이 없다 */
    if (viewport.zoom === MIN_ZOOM) return

    drag.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      x: viewport.x,
      y: viewport.y,
    }
    draggedRef.current = false
    capturedRef.current = false
    setDragging(true)
    /*
     * 여기서 포인터를 붙잡지 않는다.
     *
     * setPointerCapture 를 걸면 그 뒤의 포인터 이벤트가 전부 이 SVG 로 가고, click 은
     * 누른 곳과 뗀 곳의 공통 조상에서 나므로 안쪽 <g role="button"> 까지 닿지 못한다.
     * 확대만 해 두고 동을 눌렀을 때 아무 일도 일어나지 않던 것이 이 때문이다.
     *
     * 실제로 끌기 시작한 뒤에 건다. 손가락이 움직이지 않았다면 캡처가 없어 클릭이
     * 평소대로 흐른다.
     */
  }

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const start = drag.current
    if (!start) return

    const deltaX = event.clientX - start.clientX
    const deltaY = event.clientY - start.clientY

    if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
      draggedRef.current = true

      if (!capturedRef.current) {
        event.currentTarget.setPointerCapture(event.pointerId)
        capturedRef.current = true
      }
    }

    /* 아직 클릭일 수 있는 거리다. 지도를 흔들지 않고 기다린다 */
    if (!draggedRef.current) return

    /* 화면에서 움직인 거리를 viewBox 단위로 환산한다 */
    const rect = event.currentTarget.getBoundingClientRect()
    const { zoom } = viewport

    setViewport(
      clampViewport(
        start.x - (deltaX / rect.width) * (width / zoom),
        start.y - (deltaY / rect.height) * (height / zoom),
        zoom,
      ),
    )
  }

  const handlePointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (capturedRef.current) {
      event.currentTarget.releasePointerCapture(event.pointerId)
      capturedRef.current = false
    }

    drag.current = null
    setDragging(false)
  }

  const reset = () => setViewport({ x: 0, y: 0, zoom: MIN_ZOOM })

  return {
    /** SVG 에 그대로 넘긴다. 콜백 ref 라 DOM 이 붙고 떨어질 때 훅이 알 수 있다 */
    svgRef: setSvg,
    viewBox: `${viewport.x} ${viewport.y} ${width / viewport.zoom} ${height / viewport.zoom}`,
    zoom: viewport.zoom,
    /** 확대한 상태인가. 리셋 버튼을 띄울지 정한다 */
    zoomed: viewport.zoom > MIN_ZOOM,
    dragging,
    /** 방금 눌림이 끌기였는지. 끌고 나서 손을 뗄 때 상권이 바뀌면 안 된다 */
    wasDragged: () => draggedRef.current,
    reset,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
    },
  }
}
