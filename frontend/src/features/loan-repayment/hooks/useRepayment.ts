import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getLoanProducts,
  getRepaymentDetail,
  repayInFull,
} from '@/features/loan-repayment/api/repayment'
import { queryKeys } from '@/shared/api/queryKeys'

/** 상환은 하루 한 번이라 화면을 보는 동안 값이 바뀌지 않는다 */
const STALE_TIME_MS = 5 * 60 * 1000

export function useLoanProducts() {
  return useQuery({
    queryKey: queryKeys.repayment.list,
    queryFn: getLoanProducts,
    staleTime: STALE_TIME_MS,
  })
}

/**
 * 선택한 상품의 상환 내역.
 *
 * accountNo 가 없으면(목록을 아직 못 받았거나 대출이 0건이면) 부르지 않는다.
 * 캐시 키에 accountNo 가 들어가서, 탭을 바꾸면 이전 상품 데이터가 남지 않는다.
 */
export function useRepaymentDetail(accountNo?: string) {
  return useQuery({
    queryKey: queryKeys.repayment.detail(accountNo ?? ''),
    queryFn: () => {
      if (!accountNo) throw new Error('accountNo 없이 상환 내역을 호출했다')
      return getRepaymentDetail(accountNo)
    },
    enabled: Boolean(accountNo),
    staleTime: STALE_TIME_MS,
  })
}

/**
 * 완납.
 *
 * ⚠️ 완납하면 SSAFY 금융망에서 계좌 자체가 삭제된다. 그래서 성공 후 처리가 보통의
 *    "무효화하고 다시 받기" 와 다르다.
 *
 *    - 그 계좌의 상환 내역은 다시 부르면 400 이 온다. 무효화가 아니라 캐시에서 지운다.
 *    - 목록만 다시 받는다. 완납한 상품은 빠진 채로 돌아온다.
 *    - 선택돼 있던 탭이 사라지므로 화면에서 다른 탭으로 옮겨야 한다 (페이지가 처리).
 *
 * 성공하면 목록과 내역을 모두 무효화한다. 잔액·회차·계좌 상태가 한꺼번에 바뀌는데
 * 어느 하나라도 옛 값이 남아 있으면 "완납했는데 잔액이 남아 있다" 로 보인다.
 */
export function useRepayInFull() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (accountNo: string) => repayInFull(accountNo),
    onSuccess: (_data, accountNo) => {
      // 없어진 계좌를 다시 조회하지 않도록 캐시에서 제거한다
      queryClient.removeQueries({ queryKey: queryKeys.repayment.detail(accountNo) })
      queryClient.invalidateQueries({ queryKey: queryKeys.repayment.list })
    },
  })
}
