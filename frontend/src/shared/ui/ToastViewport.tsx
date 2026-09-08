import { createPortal } from 'react-dom'

import { useUiStore } from '@/shared/lib/store/useUiStore'
import Toast from '@/shared/ui/Toast'

/**
 * 토스트가 실제로 보이는 곳. 앱 루트에 **한 번만** 마운트합니다.
 * (app/providers 또는 RootLayout — 화면마다 넣으면 토스트가 겹쳐서 뜹니다)
 *
 * document.body 로 portal 하는 이유: 마운트되는 위치의 조상에 overflow:hidden 이나
 * transform 이 있으면 position:fixed 가 그 안에 갇힙니다. 어디에 붙일지는 레이아웃
 * 담당이 정하므로, 위치에 영향받지 않도록 body 로 빼둡니다.
 *
 * z-index 규칙: 헤더 30 < 모달 50 < 토스트 60.
 * 모달에서 저장하다 에러가 나면 그 토스트가 모달 위에 보여야 합니다.
 */
export default function ToastViewport() {
  const toasts = useUiStore((state) => state.toasts)
  const dismissToast = useUiStore((state) => state.dismissToast)

  if (toasts.length === 0) return null

  return createPortal(
    <div
      // pointer-events-none: 토스트가 없는 빈 영역이 화면 클릭을 막지 않게 합니다
      // (각 Toast 가 pointer-events-auto 로 자기 영역만 되살립니다)
      className="pointer-events-none fixed right-6 bottom-6 z-60 flex flex-col-reverse gap-3"
      aria-label="알림"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => dismissToast(toast.id)}
        />
      ))}
    </div>,
    document.body,
  )
}
