import { useQuery } from '@tanstack/react-query'

import { getSupportProgramDetail } from '@/features/support-program/api/supportPrograms'
import { queryKeys } from '@/shared/api/queryKeys'

/** 공고 내용은 자주 바뀌지 않는다. 모달을 다시 열 때 재요청하지 않게 1분 잡는다 */
const STALE_TIME_MS = 60 * 1000

/**
 * 지원사업 상세.
 *
 * 주소의 :supportProgramId 를 숫자로 바꿔 넘긴다. 숫자가 아니면 enabled 로 요청을
 * 막는다 — 안 막으면 /api/v1/support/NaN 이 나간다.
 */
export function useSupportProgramDetail(supportProgramId: number) {
  return useQuery({
    queryKey: queryKeys.supportProgram.detail(supportProgramId),
    queryFn: () => getSupportProgramDetail(supportProgramId),
    enabled: Number.isInteger(supportProgramId) && supportProgramId > 0,
    staleTime: STALE_TIME_MS,
  })
}
