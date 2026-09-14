import { useQuery } from '@tanstack/react-query'

import { getPayoutAccounts } from '@/features/application/api/accounts'
import { queryKeys } from '@/shared/api/queryKeys'

/** 화면을 보는 동안 계좌가 늘어날 일이 없다 */
const STALE_TIME_MS = 5 * 60 * 1000

export function usePayoutAccounts() {
  return useQuery({
    queryKey: queryKeys.account.list,
    queryFn: getPayoutAccounts,
    staleTime: STALE_TIME_MS,
  })
}
