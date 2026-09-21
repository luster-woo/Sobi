import { useEffect, useRef, useState } from 'react'

/** 값 하나가 제자리를 찾는 데 쓰는 시간 */
const DEFAULT_DURATION_MS = 700

interface AnimatedNumberOptions {
  /** 처음 마운트될 때 출발할 값 */
  from?: number
  durationMs?: number
}

/**
 * 끝이 빠르게 붙는 곡선(easeOutCubic).
 *
 * 선형으로 움직이면 기계가 옮기는 것처럼 보인다. 처음에 크게 움직이고 끝에서 잦아들면
 * 눈이 최종값에 자연스럽게 안착한다.
 */
function easeOut(t: number): number {
  return 1 - (1 - t) ** 3
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/**
 * 값이 바뀌면 지금 보이는 숫자에서 새 값까지 미끄러지는 수.
 *
 * 화면에 이미 74 가 떠 있는데 다음 조회가 26 이면 74 에서 26 으로 줄어든다. 새 값으로
 * 툭 바뀌면 숫자가 달라졌다는 것만 알고 어느 쪽으로 움직였는지는 모른다 — 상권을
 * 바꿔 가며 비교하는 화면에서는 그 방향이 곧 정보다.
 *
 * CSS transition 으로는 안 된다. 그쪽은 길이·색 같은 스타일만 보간할 수 있고 글자로
 * 찍히는 숫자는 못 건드린다. 눈금 위치와 그 위에 적힌 수가 따로 놀면 안 되니 둘 다
 * 이 훅이 만든 값으로 그린다.
 *
 * 표시 중인 값을 ref 로 들고 있는 이유는 애니메이션 도중에 값이 또 바뀔 수 있어서다.
 * 목표만 보고 있으면 이전 목표에서 다시 출발해 화면이 한 번 튄다.
 */
export function useAnimatedNumber(target: number, options: AnimatedNumberOptions = {}): number {
  const { from = 0, durationMs = DEFAULT_DURATION_MS } = options

  const [value, setValue] = useState(from)
  const shown = useRef(from)

  useEffect(() => {
    const start = shown.current

    if (start === target) return

    /*
     * 움직임을 끈 사용자에게는 첫 프레임에서 바로 끝낸다.
     *
     * effect 안에서 곧장 setState 하지 않고 이 경로도 프레임을 한 번 태우는 이유는,
     * 동기 setState 가 렌더를 연쇄시켜서다(ESLint 가 잡는 그것). 어차피 한 프레임이라
     * 사람 눈에는 즉시 바뀐 것과 같다.
     */
    const immediate = prefersReducedMotion()

    let frame = 0
    const startedAt = performance.now()

    const step = (now: number) => {
      const progress = immediate ? 1 : Math.min(1, (now - startedAt) / durationMs)
      const next = start + (target - start) * easeOut(progress)

      shown.current = next
      setValue(next)

      if (progress < 1) {
        frame = requestAnimationFrame(step)
        return
      }

      // 마지막 프레임은 보간값이 아니라 목표값으로 맞춘다. 0.03 이 남으면 반올림이 흔들린다
      shown.current = target
      setValue(target)
    }

    frame = requestAnimationFrame(step)

    return () => cancelAnimationFrame(frame)
  }, [target, durationMs])

  return value
}
