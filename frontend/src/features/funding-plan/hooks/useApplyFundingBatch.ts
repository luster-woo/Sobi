import { useMutation, useQueryClient } from '@tanstack/react-query'

import { applyFundingBatch } from '@/features/funding-plan/api/funding'
import type { FundingBatchItem } from '@/features/funding-plan/model/types'
import { queryKeys } from '@/shared/api/queryKeys'

/**
 * 고른 조합으로 신청 시작.
 *
 * 목록 무효화를 onSuccess 가 아니라 onSettled 로 한다. 서버가 항목을 하나씩 만들다가
 * 중간에서 던지면(이미 진행 중이면 409, 마감이면 400) 앞의 건은 이미 만들어진 채로
 * 500 이 온다. 실패했다고 아무것도 안 생긴 게 아니라서, 목록을 다시 받아봐야 안다.
 *
 * 만들어진 신청 id 를 쓰지 않는다. 응답이 비어 있기도 하고, 나중에 서버가 id 를
 * 실어주더라도 이 훅을 고칠 일이 없게 두려는 것이다.
 */
export function useApplyFundingBatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (items: FundingBatchItem[]) => applyFundingBatch(items),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.application.list })
    },
  })
}
