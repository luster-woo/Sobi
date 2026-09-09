import { useCallback, useEffect, useRef, useState } from 'react'

interface UseCountdownResult {
  /** 남은 초. 0 이면 만료 */
  remaining: number
  running: boolean
  /** 주어진 초로 다시 시작한다. 재전송 시 호출 */
  start: (seconds: number) => void
  stop: () => void
}

/**
 * 인증번호 유효시간 카운트다운.
 *
 * setInterval 로 1초씩 빼지 않고 종료 시각을 기준으로 계산한다. 탭이 백그라운드로
 * 가면 브라우저가 타이머를 늦추기 때문에, 초를 세는 방식은 돌아왔을 때 남은 시간이
 * 실제보다 많게 표시된다.
 */
export function useCountdown(): UseCountdownResult {
  const [remaining, setRemaining] = useState(0)
  const endAtRef = useRef<number | null>(null)
  const timerRef = useRef<number | null>(null)

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    clear()
    endAtRef.current = null
    setRemaining(0)
  }, [clear])

  const start = useCallback(
    (seconds: number) => {
      clear()
      endAtRef.current = Date.now() + seconds * 1000
      setRemaining(seconds)

      timerRef.current = window.setInterval(() => {
        const endAt = endAtRef.current
        if (endAt === null) return

        const next = Math.max(0, Math.ceil((endAt - Date.now()) / 1000))
        setRemaining(next)

        if (next === 0) clear()
      }, 1000)
    },
    [clear],
  )

  /* 언마운트 시 타이머를 남기지 않는다 */
  useEffect(() => clear, [clear])

  return { remaining, running: remaining > 0, start, stop }
}
