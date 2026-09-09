import { useQuery } from '@tanstack/react-query'

import { getLoans } from '@/features/loan/api/loans'
import type { LoanListParams } from '@/features/loan/model/types'
import { queryKeys } from '@/shared/api/queryKeys'

/** 상품 목록은 자주 바뀌지 않는다. 필터를 오가며 다시 부르지 않게 1분 잡는다 */
const STALE_TIME_MS = 60 * 1000

/**
 * 대출 상품 목록 조회.
 *
 * placeholderData 로 이전 페이지 데이터를 유지합니다. 없으면 페이지를 넘길 때마다
 * 목록이 비었다가 채워져서 표가 깜빡이고, 스켈레톤이 매번 튀어나옵니다.
 * (react-query v5 에서 keepPreviousData 가 이 형태로 바뀌었습니다)
 */
export function useLoans(params: LoanListParams) {
  return useQuery({
    queryKey: queryKeys.loan.list(params),
    queryFn: () => getLoans(params),
    staleTime: STALE_TIME_MS,
    placeholderData: (previous) => previous,
  })
}
