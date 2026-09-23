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
 *
 * 토스트가 없어도 이 컨테이너는 계속 마운트해 둡니다. live region 은 내용이
 * 들어오기 **전부터** DOM 에 있어야 스크린리더가 삽입을 감지합니다 — 토스트와 함께
 * 생기면 첫 토스트를 놓칩니다.
 */
export default function ToastViewport() {
  const toasts = useUiStore((state) => state.toasts)
  const dismissToast = useUiStore((state) => state.dismissToast)

  return createPortal(
    <div
      aria-label="알림"
      aria-live="polite"
      // 새로 들어온 토스트만 읽습니다. true 면 토스트가 쌓일 때마다 전체를 다시 읽습니다
      aria-atomic="false"
      // pointer-events-none: 토스트가 없는 빈 영역이 화면 클릭을 막지 않게 합니다
      // (각 Toast 가 pointer-events-auto 로 자기 영역만 되살립니다)
      className="pointer-events-none fixed right-6 bottom-6 z-60 flex flex-col-reverse gap-3"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          variant={toast.variant}
          onDismiss={dismissToast}
        />
      ))}
    </div>,
    document.body,
  )
}
