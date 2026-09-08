import { type Location, useLocation } from 'react-router'

import { ROUTES } from '@/shared/constants/routes'

/**
 * 화면은 133(인증/온보딩)에서 만든다. 라우트가 잡히는지 확인하는 자리다.
 *
 * ProtectedRoute 가 `state.from` 으로 원래 목적지를 넘겨준다. 로그인 성공 후
 * 여기로 되돌려야 한다 — 그 계약을 남겨두려고 읽어만 둔다.
 */
export function LoginPage() {
  const location = useLocation()
  const from = (location.state as { from?: Location } | null)?.from?.pathname ?? ROUTES.DASHBOARD

  return <div>login (from: {from})</div>
}
