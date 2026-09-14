import './index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/app/App'

/**
 * MSW를 켤지 정합니다. `VITE_USE_MOCK=true` 일 때만 켜집니다.
 *
 * 예전에는 `import.meta.env.DEV ||` 가 앞에 붙어 개발 모드에서 무조건 켜졌습니다.
 * 그 상태로는 실서버로 요청이 나갈 수 없어 연동을 검증할 방법이 없었습니다.
 *
 * 목을 켠 채로 일부 도메인만 실서버로 보내려면 `VITE_MOCK_DOMAINS` 를 씁니다
 * (`mocks/handlers/index.ts`).
 *
 * ⚠️ 켜지면 목 코드와 서비스워커가 번들에 포함됩니다. 배포에서는 꺼야 합니다.
 */
const useMock = import.meta.env.VITE_USE_MOCK === 'true'

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
