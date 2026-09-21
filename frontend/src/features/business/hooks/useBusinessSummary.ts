import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

import { getBusinessSummary } from '@/features/business/api/summary'
import { queryKeys } from '@/shared/api/queryKeys'
import { useAuthStore } from '@/shared/lib/store/useAuthStore'

/** 업체 정보는 자주 바뀌지 않는다. 화면을 옮길 때마다 다시 부르지 않게 길게 잡는다 */
const STALE_TIME_MS = 5 * 60 * 1000

/**
 * 내 업체 요약 조회. 사이드바 카드와 업체 등록 가드가 같이 쓴다.
 *
 * 로그인 상태에서만 호출한다 — 비로그인일 때 켜두면 401 → 재발급까지 딸려가서
 * 로그인 화면에서 요청이 두 번 나간다.
 *
 * ⚠️ **role 로 끄지 않는다.** 예비창업자는 `business_info` 가 없어 404 라는 이유로
 *    한동안 꺼 뒀는데, 손에 든 토큰의 role 과 DB 의 role 이 어긋나는 구간이 바로
 *    이 조회가 필요한 구간이다. 업체 등록 직후 재발급이 실패하면 토큰은
 *    PREENTREPRENEUR 인데 서버에는 업체가 있고, 그때 조회가 꺼져 있으면 등록 화면이
 *    '미등록' 으로 보여 같은 계정에 두 번째 업체가 생긴다(`BusinessVerifyPage` 참고).
 *    미등록 계정이 404 를 한 번 더 받는 비용보다 그쪽이 훨씬 비싸다.
 *
 * 404(업체 미등록)는 재시도하지 않는다. 없는 걸 세 번 더 물어봐도 없다.
 */
export function useBusinessSummary() {
  const status = useAuthStore((s) => s.status)

  return useQuery({
    queryKey: queryKeys.business.meSummary,
    queryFn: getBusinessSummary,
    enabled: status === 'authenticated',
    staleTime: STALE_TIME_MS,
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response?.status === 404) return false
      return failureCount < 2
    },
  })
}
