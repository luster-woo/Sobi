import './index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'

/**
 * 개발 환경에서만 MSW를 켭니다.
 * 프로덕션 번들에는 동적 import 덕에 MSW 코드가 포함되지 않습니다.
 */
async function enableMocking() {
  if (!import.meta.env.DEV) return

  const { worker } = await import('./mocks/browser')

  // 핸들러가 없는 요청은 실제 서버로 통과시킵니다
  return worker.start({ onUnhandledRequest: 'bypass' })
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
