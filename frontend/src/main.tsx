import './index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/app/App'

/**
 * MSW를 켤지 정합니다.
 *
 * 개발 중에는 항상 켜고, 배포에서는 `VITE_USE_MOCK=true` 일 때만 켭니다.
 * 백엔드가 아직 없어 배포 사이트에서도 목으로 시연해야 하기 때문입니다.
 *
 * ⚠️ 이 플래그가 켜지면 목 코드가 번들에 포함됩니다. 백엔드가 붙으면 배포 환경변수에서
 *    지우세요 — 코드는 그대로 두면 됩니다.
 */
const useMock = import.meta.env.DEV || import.meta.env.VITE_USE_MOCK === 'true'

async function enableMocking() {
  if (!useMock) return

  const { worker } = await import('@/mocks/browser')

  return worker.start({
    // 핸들러가 없는 요청은 실제 서버로 통과시킵니다
    onUnhandledRequest: 'bypass',
    // 배포 경로가 루트가 아닐 수 있어 base 를 붙입니다
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
}

/**
 * 목 준비에 실패해도 화면은 띄웁니다.
 *
 * 예전에는 `enableMocking().then(...)` 이라 worker.start() 가 거부되면 render 가
 * 아예 안 돌아 흰 화면만 남았습니다. 서비스 워커는 사파리 시크릿 모드 등에서
 * 등록이 막힙니다.
 */
function render() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

enableMocking()
  .catch((error) => {
    console.error('[MSW] 목 서버를 시작하지 못했습니다. 실제 API로 요청합니다.', error)
  })
  .finally(render)
