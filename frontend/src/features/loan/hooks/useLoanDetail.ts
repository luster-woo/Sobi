import { useQuery } from '@tanstack/react-query'

import { getLoanDetail } from '@/features/loan/api/loans'
import { queryKeys } from '@/shared/api/queryKeys'

/** 상품 정보는 자주 바뀌지 않는다. 모달을 다시 열 때 재요청하지 않게 1분 잡는다 */
const STALE_TIME_MS = 60 * 1000

/**
 * 대출 상품 상세.
 *
 * 주소의 :loanId 를 숫자로 바꿔 넘긴다. `/loans/abc` 같은 주소면 NaN 이 되므로
 * enabled 로 요청을 막는다 — 안 막으면 /api/v1/loan/NaN 이 나간다.
 */
export function useLoanDetail(loanId: number) {
  return useQuery({
    queryKey: queryKeys.loan.detail(loanId),
    queryFn: () => getLoanDetail(loanId),
    enabled: Number.isInteger(loanId) && loanId > 0,
    staleTime: STALE_TIME_MS,
  })
}
