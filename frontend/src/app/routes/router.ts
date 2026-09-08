import { createBrowserRouter, redirect } from 'react-router'

import { RootLayout } from '@/app/layouts/RootLayout'
import { ProtectedRoute } from '@/app/routes/ProtectedRoute'
import { PublicOnlyRoute } from '@/app/routes/PublicOnlyRoute'
import { RouteError } from '@/app/routes/RouteError'
import { ROUTES } from '@/shared/constants/routes'

/**
 * 라우트 정의.
 *
 * `element: <X />` 대신 `Component: X` 를 쓴다. JSX 가 없어야 이 파일이 .ts 로 남고,
 * 그래야 fast refresh 규칙(컴포넌트와 상수를 같이 export 하지 말 것)에 걸리지 않는다.
 *
 * `lazy` 는 그 경로에 처음 들어갈 때 청크를 받아온다. 페이지가 10개 넘게 늘어날 예정이라
 * 첫 로딩에 전부 포함되지 않게 처음부터 이 형태로 둔다.
 */
export const router = createBrowserRouter([
  {
    // path 없는 레이아웃 라우트. 모든 화면이 이 아래에 들어간다
    Component: RootLayout,
    ErrorBoundary: RouteError,
    children: [
      {
        index: true,
        // 랜딩 페이지가 정해지기 전까지는 대시보드로 보낸다.
        // 비로그인이면 ProtectedRoute 가 다시 /login 으로 넘긴다.
        loader: () => redirect(ROUTES.DASHBOARD),
      },
      {
        Component: PublicOnlyRoute,
        children: [
          {
            path: ROUTES.LOGIN,
            lazy: async () => ({ Component: (await import('@/pages/LoginPage')).LoginPage }),
          },
        ],
      },
      {
        Component: ProtectedRoute,
        children: [
          {
            path: ROUTES.DASHBOARD,
            lazy: async () => ({
              Component: (await import('@/pages/DashboardPage')).DashboardPage,
            }),
          },
        ],
      },
      {
        path: '*',
        lazy: async () => ({ Component: (await import('@/pages/NotFoundPage')).NotFoundPage }),
      },
    ],
  },
])
