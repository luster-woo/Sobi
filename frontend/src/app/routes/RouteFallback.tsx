import Spinner from '@/shared/ui/Spinner'

/**
 * 세션 복구를 기다리는 동안 렌더된다.
 *
 * 짧아 보이지만 `POST /auth/refresh` 왕복 전체(최대 10초)를 덮는 구간이라,
 * 새로고침하거나 주소로 바로 들어올 때마다 사용자가 처음 보는 화면이다.
 */
export function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <Spinner size={48} label="불러오는 중" />
    </div>
  )
}
