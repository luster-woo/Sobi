import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

import { getBusinessSummary } from '@/features/business/api/summary'
import { queryKeys } from '@/shared/api/queryKeys'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'
import { USER_ROLE } from '@/shared/types'

/** 업체 정보는 자주 바뀌지 않는다. 화면을 옮길 때마다 다시 부르지 않게 길게 잡는다 */
const STALE_TIME_MS = 5 * 60 * 1000

/**
 * 사이드바 하단 업체 카드용 조회.
 *
 * 창업자(OWNER)이고 로그인된 상태에서만 호출한다.
 * - 비로그인일 때 켜두면 401 → 재발급까지 딸려가서 로그인 화면에서 요청이 두 번 나간다.
 * - 예비 창업자(PRE_OWNER)는 `business_info` 가 아예 없어서 무조건 404 다. 없는 걸
 *   물어보지 않는다.
 *
 * 404(업체 미등록)는 재시도하지 않는다. 없는 걸 세 번 더 물어봐도 없다.
 */
export function useBusinessSummary() {
  const status = useAuthStore((s) => s.status)
  const role = useAuthStore((s) => s.user?.role)

  return useQuery({
    queryKey: queryKeys.business.meSummary,
    queryFn: getBusinessSummary,
    enabled: status === 'authenticated' && role === USER_ROLE.ENTREPRENEUR,
    staleTime: STALE_TIME_MS,
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 404) return false
      return failureCount < 2
    },
  })
}
