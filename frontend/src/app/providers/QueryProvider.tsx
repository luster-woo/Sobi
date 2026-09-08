import { QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense, type ReactNode } from 'react'

import { queryClient } from '@/shared/api/queryClient'

/**
 * 개발 환경에서만 devtools 를 띄운다.
 *
 * `import.meta.env.DEV` 는 빌드 시 false 로 치환되므로 프로덕션에서는 이 삼항이
 * null 로 접히고 dynamic import 가 도달 불가 코드가 되어 번들에서 빠진다.
 * (main.tsx 의 MSW 처리와 같은 방식)
 */
const Devtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })),
    )
  : null

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {Devtools && (
        <Suspense fallback={null}>
          <Devtools buttonPosition="bottom-left" />
        </Suspense>
      )}
    </QueryClientProvider>
  )
}
