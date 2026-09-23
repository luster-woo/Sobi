import { useQuery } from '@tanstack/react-query'

import { getMyPage } from '@/features/mypage/api/mypage'
import { queryKeys } from '@/shared/api/queryKeys'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'

/**
 * 내 정보. 마이페이지와 연동 계좌 화면이 같이 쓴다.
 *
 * 짧게 잡는다. 업체 정보나 알림 설정을 고치고 돌아오는 흐름이 흔한데 길게 잡으면
 * 방금 바꾼 값이 안 보인다.
 */
const STALE_TIME_MS = 30 * 1000

export function useMyPage() {
  const status = useAuthStore((state) => state.status)

  return useQuery({
    queryKey: queryKeys.user.mypage,
    queryFn: getMyPage,
    enabled: status === 'authenticated',
    staleTime: STALE_TIME_MS,
  })
}
