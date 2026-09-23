import type { ToastVariant } from '@/shared/lib/store/useUiStore'

/**
 * 전체 이동(`window.location`)을 건너서 띄우는 토스트.
 *
 * 토스트 스토어는 메모리라 전체 이동을 하면 비워진다. 그런데 탈퇴는 가드와 경쟁하지
 * 않으려고 일부러 전체 이동을 쓴다(`useWithdraw` · `useLogout` 주석). 그래서
 * "다 끝났어요" 를 말할 자리가 없어진다 — 결과를 알려야 하는 동작인데 화면만 바뀌고
 * 아무 말이 없다.
 *
 * 지금 쓰는 곳은 탈퇴 하나뿐이다. 로그아웃은 스스로 나간 것이라 굳이 알릴 것이 없어
 * 붙이지 않았다.
 *
 * sessionStorage 에 한 줄 적어 두고 도착한 화면이 한 번 꺼내 쓴다. 탭을 닫으면 사라지고,
 * 꺼내면서 지우므로 새로고침해도 다시 뜨지 않는다.
 */

const KEY = 'pending-toast'

/**
 * 적어둔 지 이만큼 지나면 버린다.
 *
 * 도착한 화면이 못 꺼내는 경우가 있다 — 예를 들어 랜딩(`/`)에 내려놨는데 그 사이
 * 세션이 아직 살아 있다고 판정되면 가드가 대시보드로 보내버리고, 적어둔 줄은 소비되지
 * 않은 채 남는다. 그러면 같은 탭에서 한참 뒤 `/` 에 들렀을 때 뜬금없이 '탈퇴가
 * 완료됐어요' 가 뜬다. 이동 직후에 읽히는 값이라 몇 초면 충분하다.
 */
const TTL_MS = 10_000

interface PendingToast {
  message: string
  variant: ToastVariant
}

interface StoredToast extends PendingToast {
  /** 적어둔 시각(ms). 오래된 것을 버리는 데만 쓴다 */
  at: number
}

/** 이동 직전에 적어 둔다. 실패해도 이동은 막지 않는다 — 안내가 없을 뿐이다 */
export function setPendingToast(message: string, variant: ToastVariant = 'success') {
  try {
    const stored: StoredToast = { message, variant, at: Date.now() }
    sessionStorage.setItem(KEY, JSON.stringify(stored))
  } catch {
    // 사생활 보호 모드·용량 초과
  }
}

/** 꺼내면서 지운다. 없거나 오래됐으면 null */
export function consumePendingToast(): PendingToast | null {
  try {
    const saved = sessionStorage.getItem(KEY)
    if (!saved) return null

    // 유효기간이 지난 것도 여기서 치운다. 남겨두면 다음 방문에 또 걸린다
    sessionStorage.removeItem(KEY)

    const parsed: unknown = JSON.parse(saved)
    if (typeof parsed !== 'object' || parsed === null) return null

    const { message, variant, at } = parsed as Partial<StoredToast>
    if (typeof message !== 'string') return null
    if (typeof at !== 'number' || Date.now() - at > TTL_MS) return null

    return { message, variant: variant ?? 'success' }
  } catch {
    return null
  }
}
