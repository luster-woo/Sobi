import { createBrowserRouter } from 'react-router'

import { AppLayout } from '@/app/layouts/AppLayout'
import { AuthLayout } from '@/app/layouts/AuthLayout'
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
        Component: PublicOnlyRoute,
        children: [
          {
            // 로그인 상태면 PublicOnlyRoute 가 대시보드로 넘긴다.
            // 랜딩은 자체 헤더를 갖는 마케팅 페이지라 AuthLayout 아래가 아니다
            index: true,
            lazy: async () => ({ Component: (await import('@/pages/LandingPage')).LandingPage }),
          },
          {
            // 브랜드 바 + 가운데 정렬 카드가 붙는 자리
            Component: AuthLayout,
            children: [
              {
                path: ROUTES.LOGIN,
                lazy: async () => ({ Component: (await import('@/pages/LoginPage')).LoginPage }),
              },
              {
                path: ROUTES.TERMS,
                lazy: async () => ({ Component: (await import('@/pages/TermsPage')).TermsPage }),
              },
              {
                path: ROUTES.SIGN_UP,
                lazy: async () => ({ Component: (await import('@/pages/SignUpPage')).SignUpPage }),
              },
            ],
          },
        ],
      },
      {
        Component: ProtectedRoute,
        children: [
          {
            // 사이드바·상단바가 붙는 자리. 로그인 화면은 위 PublicOnlyRoute 쪽이라 안 붙는다
            Component: AppLayout,
            children: [
              {
                path: ROUTES.DASHBOARD,
                lazy: async () => ({
                  Component: (await import('@/pages/DashboardPage')).DashboardPage,
                }),
              },
              {
                path: ROUTES.LOANS,
                lazy: async () => ({
                  Component: (await import('@/pages/LoanListPage')).LoanListPage,
                }),
              },
            ],
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
