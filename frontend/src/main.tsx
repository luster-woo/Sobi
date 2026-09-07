import './index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

import { router } from './app/router'

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

function render() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
}

/*
 * MSW 등록이 실패해도(브라우저가 서비스워커를 막는 환경 등) 앱은 떠야 하므로
 * catch 로 흡수한 뒤 항상 렌더한다. then 만 쓰면 실패 시 흰 화면이 된다.
 */
enableMocking()
  .catch((error) => {
    console.warn('[MSW] 목 서버를 켜지 못했습니다. 요청은 실제 서버로 나갑니다.', error)
  })
  .finally(render)
