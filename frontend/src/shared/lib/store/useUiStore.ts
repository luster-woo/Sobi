import { create } from 'zustand'

export type ToastVariant = 'success' | 'warning' | 'danger'

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

interface UiStore {
  toasts: Toast[]
  /** 생성된 토스트의 id 를 반환한다 — 호출한 쪽에서 직접 닫아야 할 때 쓴다 */
  showToast: (message: string, variant?: ToastVariant) => string
  dismissToast: (id: string) => void
  clearToasts: () => void
}

/**
 * 토스트 큐.
 *
 * axios 응답 인터셉터에서 서버 에러 문구를 띄워야 하는데 거기는 React 밖이라
 * 훅을 쓸 수 없다. 그래서 컴포넌트 상태가 아니라 전역에 둔다.
 * 자동 닫힘은 스토어가 아니라 토스트 컴포넌트가 타이머로 처리한다 —
 * 스토어에 setTimeout 을 두면 언마운트 시점을 알 수 없어 타이머가 남는다.
 */
export const useUiStore = create<UiStore>((set, get) => ({
  toasts: [],

  showToast: (message, variant = 'success') => {
    /*
     * 같은 문구가 이미 떠 있으면 다시 쌓지 않는다.
     *
     * react-query 가 5xx·네트워크 오류를 두 번 더 재시도하고(`queryClient.ts`)
     * 인터셉터가 시도마다 토스트를 밀어서, 오프라인으로 화면에 들어오면 같은 문구가
     * 요청 하나당 세 개씩 겹쳤다. 한 화면이 여러 요청을 보내면 그만큼 더 쌓인다.
     */
    const existing = get().toasts.find((t) => t.message === message && t.variant === variant)
    if (existing) return existing.id

    const id = crypto.randomUUID()
    set((state) => ({ toasts: [...state.toasts, { id, message, variant }] }))
    return id
  },

  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clearToasts: () => set({ toasts: [] }),
}))
