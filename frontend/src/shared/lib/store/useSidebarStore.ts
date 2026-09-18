import { create } from 'zustand'

const STORAGE_KEY = 'sidebar:collapsed'

/**
 * 접힌 상태를 탭에 남긴다.
 *
 * 화면을 옮기거나 새로고침할 때마다 다시 펴지면, 좁은 화면을 쓰려고 접은 사람이
 * 매번 다시 접어야 한다.
 *
 * ⚠️ localStorage 가 아니라 sessionStorage 다. ESLint 가 localStorage 를 막고 있고
 *    (인증 ADR), 사이드바 하나 때문에 그 규칙을 끄지 않았다. 대신 탭을 닫으면 접은
 *    것이 풀린다 — 브라우저를 껐다 켜도 남기려면 ADR 을 먼저 손봐야 한다.
 *
 * 서버에 둘 값은 아니다. 기기마다 화면 폭이 달라서 데스크톱에서 접은 것이 노트북에
 * 따라올 이유가 없다.
 *
 * 사파리 프라이빗 모드처럼 저장이 막힌 곳에서는 읽기만으로도 예외가 난다. 저장을
 * 못 할 뿐 접고 펴는 것은 되어야 해서 전부 삼킨다.
 */
function readCollapsed(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

interface SidebarStore {
  collapsed: boolean
  toggle: () => void
}

/**
 * 사이드바 접힘 상태.
 *
 * 사이드바(모양)와 상단바(여닫는 버튼)가 서로 다른 컴포넌트라 전역에 둔다. 버튼을
 * 상단바에 둔 이유는 자리가 고정되어야 해서다 — 사이드바 안에 두면 접을 때 같이
 * 움직여서 다시 펴려면 버튼을 눈으로 찾아야 한다.
 */
export const useSidebarStore = create<SidebarStore>((set) => ({
  collapsed: readCollapsed(),

  toggle: () =>
    set((state) => {
      const collapsed = !state.collapsed

      try {
        sessionStorage.setItem(STORAGE_KEY, String(collapsed))
      } catch {
        // 저장만 실패한다. 이번 세션 동안은 접힌 채로 쓸 수 있다
      }

      return { collapsed }
    }),
}))
