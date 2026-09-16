import { useCallback, useEffect, useRef, useState } from 'react'

import { logout as logoutRequest } from '@/features/auth/api/session'
import { ROUTES } from '@/shared/constants/routes'
import { clearAuthState } from '@/shared/lib/clearAuthState'
import { setPendingToast } from '@/shared/lib/pendingToast'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'

/**
 * 아무 조작이 없을 때 세션을 유지하는 시간.
 *
 * ⚠️ 이 값이 **실질적인 세션 상한이다.** 백엔드 토큰만으로는 상한이 안 생긴다 —
 *    accessToken 은 30분이지만(`application.yaml` 의 `access-exp`) 만료되면 401 →
 *    재발급으로 조용히 복구되고, `AuthServiceImpl.refresh` 가 refreshToken 을
 *    회전시키지 않아 실제 한계는 refresh-exp 인 **14일**이다. 방치된 화면을 끊는 것은
 *    이 타이머뿐이다.
 *
 * 30분으로 잡은 것은 금융·정부지원 서비스 관행이고, accessToken 수명과 우연히 같다.
 * `access-exp` 를 바꿔도 여기를 따라 바꿀 이유는 없다.
 */
const IDLE_LIMIT_MS = 30 * 60 * 1000

/** 만료 몇 분 전에 물어볼지. 작성 중인 서류를 잃지 않게 되돌릴 틈을 준다 */
const WARN_BEFORE_MS = 60 * 1000

/**
 * 조작으로 치는 이벤트.
 *
 * `mousemove` 는 넣지 않는다. 마우스가 책상 진동으로도 움직여서, 자리를 비워도
 * 세션이 끝나지 않는다 — 막으려던 상황이 그대로 남는다.
 */
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const

/**
 * 활동 기록을 너무 자주 쓰지 않게 하는 간격.
 *
 * 스크롤 한 번에 wheel 이 수십 번 뜬다. 그때마다 탭 간 메시지를 보내면 그것만으로
 * 부하가 된다 — 1초 안의 연타는 한 번으로 친다.
 */
const THROTTLE_MS = 1000

/** 탭끼리 주고받는 채널. localStorage 를 쓰지 않는다(그쪽은 lint 로 막혀 있다) */
const CHANNEL_NAME = 'sobi:idle'

type IdleMessage = { type: 'activity'; at: number } | { type: 'logout' }

/**
 * 유휴 자동 로그아웃 (S15P21D101-395).
 *
 * 공용 PC 나 사무실에서 로그인한 채 자리를 비우는 상황을 막는다. 이 서비스는 사업자
 * 금융 정보를 다뤄서, 화면이 열린 채 방치되면 그대로 노출된다.
 *
 * **탭을 건너 동기화한다.** BroadcastChannel 로 활동 시각을 나눠 갖는다. 안 하면
 * 사용자가 A 탭에서 계속 일하는 동안 B 탭이 혼자 시간을 세다 로그아웃시키고, 그러면
 * A 탭도 다음 요청에서 401 을 맞는다. 반대로 방치된 B 탭이 로그인 화면을 그대로
 * 띄우고 있는 것도 막아야 해서, 로그아웃도 함께 알린다.
 *
 * 로그인 상태에서만 돈다. 비로그인 화면에서 타이머를 돌릴 이유가 없다.
 *
 * @returns 경고 창에 필요한 것. `remainingMs` 가 null 이면 경고를 띄우지 않는다.
 */
export function useIdleLogout() {
  const status = useAuthStore((s) => s.status)
  const active = status === 'authenticated'

  /** 경고 창에 남은 시간을 보여주려고 state 로 둔다. null 이면 창이 닫힌 상태 */
  const [remainingMs, setRemainingMs] = useState<number | null>(null)

  /*
   * 마지막 조작 시각. 초깃값을 `Date.now()` 로 주지 않는다 — 렌더 중에 부르면 렌더가
   * 순수하지 않게 되고 react-hooks/purity 에 걸린다. 감시를 시작하는 effect 에서 채운다.
   */
  const lastActivityRef = useRef(0)
  const channelRef = useRef<BroadcastChannel | null>(null)

  /**
   * 종료 절차가 이미 시작됐는지.
   *
   * `logout` 은 서버 응답을 기다리는 동안 비동기로 멈춰 있고 `location.replace` 도
   * 즉시 문서를 버리지 않는다. 그 사이 1초짜리 ticker 가 계속 돌아 같은 절차를 또
   * 시작하면, 매초 로그아웃 요청과 탭 알림이 반복된다.
   */
  const endingRef = useRef(false)

  /**
   * 세션 종료. 서버 호출부터 이동까지 한 번에 한다.
   *
   * ⚠️ **서버 로그아웃이 빠지면 이 기능이 통째로 무의미해진다.** `clearAuthState` 는
   *    이 탭의 메모리만 치울 뿐 refreshToken 쿠키(14일)와 Redis 기록은 그대로 남는다.
   *    그 상태로 전체 이동을 하면 `RootLayout` → `useSession` 이 그 쿠키로 재발급을
   *    받아 **곧바로 다시 로그인된다** — 방치를 막으려던 장치가 스스로 세션을 되살린다.
   *
   * 서버 호출이 실패해도 이동은 한다. 네트워크가 끊겼다고 로그인된 화면을 그대로
   * 두는 것보다, 이 브라우저에서라도 지우고 나가는 편이 낫다(`useLogout` 과 같은 방침).
   */
  const logout = useCallback(async () => {
    // 이동이 지연되는 동안 ticker 가 또 부르는 것을 막는다
    if (endingRef.current) return
    endingRef.current = true

    setPendingToast('자리를 비우신 것 같아 안전하게 로그아웃했어요.', 'warning')

    /*
     * 다른 탭에도 알린다. clearAuthState 는 이 탭의 메모리만 치우므로, 알리지 않으면
     * 옆 탭은 로그인된 화면을 그대로 띄우고 있다.
     *
     * 서버 호출 **전에** 보낸다. 네트워크가 느리면 그 사이 옆 탭이 방치된 채 남는다.
     */
    channelRef.current?.postMessage({ type: 'logout' } satisfies IdleMessage)

    try {
      await logoutRequest()
    } catch {
      // 서버를 못 불러도 아래 정리와 이동은 그대로 진행한다
    }

    clearAuthState()

    /*
     * 전체 이동이다. `navigate` 로 옮기면 상태가 바뀌는 순간 보호 라우트와 경쟁한다
     * (`useLogout` 주석). 남아 있는 타이머·구독도 여기서 함께 버려진다.
     */
    window.location.replace(ROUTES.HOME)
  }, [])

  /** 사용자가 '계속 사용하기' 를 눌렀을 때. 바깥(경고 창)에서 부른다 */
  const extend = useCallback(() => {
    const now = Date.now()
    lastActivityRef.current = now
    setRemainingMs(null)
    channelRef.current?.postMessage({ type: 'activity', at: now } satisfies IdleMessage)
  }, [])

  useEffect(() => {
    // 비로그인 상태면 감시하지 않는다. 남은 시간은 아래 반환에서 null 로 가려진다
    if (!active) return

    lastActivityRef.current = Date.now()

    /*
     * BroadcastChannel 이 없는 환경(구형 브라우저·일부 사파리 사생활 모드)에서는
     * 탭 동기화만 포기하고 타이머는 그대로 돈다. 보안 장치가 통째로 꺼지는 것보다 낫다.
     */
    const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL_NAME) : null
    channelRef.current = channel

    channel?.addEventListener('message', (event: MessageEvent<IdleMessage>) => {
      if (event.data.type === 'logout') {
        if (endingRef.current) return
        endingRef.current = true

        /*
         * 안내를 여기서도 적는다. `pendingToast` 는 sessionStorage 라 **탭 단위**여서
         * 저쪽 탭이 적어둔 것이 이 탭에는 없다 — 안 적으면 아무 설명 없이 홈으로 튕긴다.
         */
        setPendingToast('자리를 비우신 것 같아 안전하게 로그아웃했어요.', 'warning')

        /*
         * 서버 로그아웃은 부르지 않는다. 시작한 탭이 이미 불렀고, 같은 refreshToken 에
         * 대해 또 부르면 이미 지워진 기록을 지우려 해 불필요한 실패가 난다.
         */
        clearAuthState()
        window.location.replace(ROUTES.HOME)
        return
      }

      /*
       * 다른 탭에서 활동이 있었다. 더 최근 것만 받되 **미래 시각은 받지 않는다** —
       * 탭마다 시계가 조금씩 다를 수 있고, 미래 값을 그대로 넣으면 그 차이만큼
       * 이 탭의 유휴 시간이 늘어난다.
       */
      const at = Math.min(event.data.at, Date.now())

      if (at > lastActivityRef.current) {
        lastActivityRef.current = at
        setRemainingMs(null)
      }
    })

    let lastSent = 0

    /*
     * 조작이 있으면 타이머를 되돌린다. 경고가 떠 있는 중이어도 마찬가지다 —
     * 화면을 쓰고 있다는 뜻이므로 버튼을 누르지 않아도 연장으로 본다. 모달은 다음
     * ticker 에서 `remainingMs` 가 null 이 되며 저절로 닫힌다.
     */
    const onActivity = () => {
      const now = Date.now()
      lastActivityRef.current = now

      // 탭 알림만 1초에 한 번으로 줄인다. 스크롤 한 번에 wheel 이 수십 번 뜬다
      if (now - lastSent < THROTTLE_MS) return
      lastSent = now
      channel?.postMessage({ type: 'activity', at: now } satisfies IdleMessage)
    }

    for (const type of ACTIVITY_EVENTS) {
      // passive: 스크롤을 막지 않는다는 표시. 붙이지 않으면 휠이 한 박자 늦어진다
      window.addEventListener(type, onActivity, { passive: true })
    }

    /*
     * 1 초마다 확인한다. setTimeout 으로 정확한 시각을 잡지 않는 이유: 절전·탭 비활성
     * 상태에서 타이머가 늘어져 깨어났을 때 이미 지난 시각에 불린다. 매번 '지금'과
     * 마지막 활동을 비교하면 늘어져도 결과가 같다.
     */
    const ticker = window.setInterval(() => {
      // 종료 절차가 도는 중이면 더 볼 것이 없다. 이동이 늦어져도 반복 호출되지 않는다
      if (endingRef.current) {
        window.clearInterval(ticker)
        return
      }

      const idleFor = Date.now() - lastActivityRef.current
      const left = IDLE_LIMIT_MS - idleFor

      if (left <= 0) {
        void logout()
        return
      }

      setRemainingMs(left <= WARN_BEFORE_MS ? left : null)
    }, 1000)

    return () => {
      for (const type of ACTIVITY_EVENTS) window.removeEventListener(type, onActivity)
      window.clearInterval(ticker)
      channel?.close()
      channelRef.current = null
    }
  }, [active, logout])

  /*
   * 비로그인일 때 null 로 덮는다. effect 에서 `setRemainingMs(null)` 을 부르는 대신
   * 여기서 가리는 이유: 로그아웃되는 순간 state 를 되돌리려고 effect 안에서 setState 를
   * 하면 렌더가 한 번 더 도는데(react-hooks/set-state-in-effect), 어차피 화면에
   * 보여줄 값이 없는 상태라 계산으로 끝내는 편이 단순하다.
   */
  return { remainingMs: active ? remainingMs : null, extend }
}
